const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/reports/pivot?groupBy=building&filterType=contract&search=...
router.get('/pivot', authenticate, asyncHandler(async (req, res) => {
  const { groupBy, filterType, search } = req.query;
  if (!groupBy) return res.status(400).json({ error: 'groupBy is required' });

  // Get all non-deleted entities with their types
  let sql = `SELECT e.id, e.name, e.properties, et.name as type_name, et.name_ru as type_name_ru, et.icon, et.color
    FROM entities e JOIN entity_types et ON e.entity_type_id = et.id
    WHERE e.deleted_at IS NULL`;
  const params = [];

  if (filterType) {
    params.push(filterType);
    sql += ` AND et.name = $${params.length}`;
  }
  if (search) {
    params.push('%' + search.replace(/[%_]/g, '\\$&') + '%');
    sql += ` AND e.name ILIKE $${params.length}`;
  }
  sql += ' ORDER BY e.name';

  const { rows: entities } = await pool.query(sql, params);

  // Group by the specified property field
  const groups = {};
  entities.forEach(e => {
    const props = e.properties || {};
    let val = props[groupBy];

    // Handle rent_objects (array of objects with building/room etc)
    if (!val && props.rent_objects) {
      try {
        const objs = typeof props.rent_objects === 'string' ? JSON.parse(props.rent_objects) : props.rent_objects;
        if (Array.isArray(objs)) {
          objs.forEach(obj => {
            const v = obj[groupBy];
            if (v && v.trim()) {
              const key = v.trim();
              if (!groups[key]) groups[key] = { value: key, entities: [] };
              groups[key].entities.push({
                id: e.id, name: e.name, type_name: e.type_name,
                type_name_ru: e.type_name_ru, icon: e.icon, color: e.color,
                properties: props
              });
            }
          });
          return; // already processed
        }
      } catch (ex) {}
    }

    if (!val || !String(val).trim()) return;
    const key = String(val).trim();
    if (!groups[key]) groups[key] = { value: key, entities: [] };
    groups[key].entities.push({
      id: e.id, name: e.name, type_name: e.type_name,
      type_name_ru: e.type_name_ru, icon: e.icon, color: e.color,
      properties: props
    });
  });

  // Sort groups by key
  const result = Object.values(groups).sort((a, b) => a.value.localeCompare(b.value, 'ru'));
  res.json({ groupBy, groups: result, totalEntities: entities.length });
}));

// GET /api/reports/fields — list all property fields across all entities for pivot selection
router.get('/fields', authenticate, asyncHandler(async (req, res) => {
  // Get field definitions
  const { rows: fields } = await pool.query(
    `SELECT DISTINCT fd.name, fd.name_ru, fd.field_type, et.name as entity_type, et.name_ru as entity_type_ru
    FROM field_definitions fd JOIN entity_types et ON fd.entity_type_id = et.id
    ORDER BY fd.name`
  );

  // Also scan properties for dynamic fields (from CONTRACT_TYPE_FIELDS)
  const { rows: propKeys } = await pool.query(
    `SELECT DISTINCT jsonb_object_keys(properties) as key FROM entities WHERE deleted_at IS NULL`
  );

  // Merge: field definitions + dynamic property keys
  const allFields = new Map();
  fields.forEach(f => allFields.set(f.name, { name: f.name, name_ru: f.name_ru, field_type: f.field_type, entity_type: f.entity_type, source: f.entity_type_ru }));
  propKeys.forEach(pk => {
    if (!allFields.has(pk.key)) {
      allFields.set(pk.key, { name: pk.key, name_ru: pk.key, field_type: 'text', source: 'properties' });
    }
  });

  res.json(Array.from(allFields.values()));
}));

// GET /api/reports/linked?type=equipment_by_location|equipment_by_tenant
router.get('/linked', authenticate, asyncHandler(async (req, res) => {
  const { type } = req.query;

  if (type === 'equipment_by_location') {
    // Equipment grouped by where it's installed (parent_id OR located_in relation)
    const { rows } = await pool.query(`
      SELECT
        loc.id      AS loc_id,
        loc.name    AS loc_name,
        lot.icon    AS loc_icon,
        lot.name_ru AS loc_type,
        e.id        AS eq_id,
        e.name      AS eq_name,
        et.icon     AS eq_icon,
        e.properties AS eq_props,
        'parent'    AS link_type
      FROM entities e
      JOIN entity_types et  ON et.id  = e.entity_type_id AND et.name IN ('equipment','crane_track')
      JOIN entities loc     ON loc.id = e.parent_id
      JOIN entity_types lot ON lot.id = loc.entity_type_id AND lot.name IN ('building','room','workshop','land_plot')
      WHERE e.deleted_at IS NULL AND loc.deleted_at IS NULL

      UNION

      SELECT
        loc.id      AS loc_id,
        loc.name    AS loc_name,
        lot.icon    AS loc_icon,
        lot.name_ru AS loc_type,
        e.id        AS eq_id,
        e.name      AS eq_name,
        et.icon     AS eq_icon,
        e.properties AS eq_props,
        'relation'  AS link_type
      FROM entities e
      JOIN entity_types et  ON et.id = e.entity_type_id AND et.name IN ('equipment','crane_track')
      JOIN relations r      ON r.from_entity_id = e.id AND r.relation_type = 'located_in'
      JOIN entities loc     ON loc.id = r.to_entity_id
      JOIN entity_types lot ON lot.id = loc.entity_type_id AND lot.name IN ('building','room','workshop','land_plot')
      WHERE e.deleted_at IS NULL AND loc.deleted_at IS NULL

      ORDER BY loc_name, eq_name
    `);

    const groups = {};
    rows.forEach(row => {
      const key = row.loc_id;
      if (!groups[key]) groups[key] = { id: row.loc_id, name: row.loc_name, icon: row.loc_icon, type: row.loc_type, items: [] };
      if (row.eq_id && !groups[key].items.find(i => i.id === row.eq_id)) {
        groups[key].items.push({ id: row.eq_id, name: row.eq_name, icon: row.eq_icon, props: row.eq_props });
      }
    });
    return res.json({ type, groups: Object.values(groups).sort((a, b) => a.name.localeCompare(b.name, 'ru')) });
  }

  if (type === 'equipment_by_tenant') {
    // Tenant companies → their rental contracts → buildings → equipment in those buildings
    const { rows } = await pool.query(`
      SELECT DISTINCT
        comp.id     AS tenant_id,
        comp.name   AS tenant_name,
        c.id        AS contract_id,
        c.name      AS contract_name,
        b.id        AS building_id,
        b.name      AS building_name,
        bt.icon     AS building_icon,
        e.id        AS eq_id,
        e.name      AS eq_name,
        et.icon     AS eq_icon,
        e.properties AS eq_props
      FROM entities comp
      JOIN entity_types ct     ON ct.id = comp.entity_type_id AND ct.name = 'company'
      JOIN relations r_party   ON r_party.to_entity_id = comp.id AND r_party.relation_type = 'party_to'
      JOIN entities c          ON c.id = r_party.from_entity_id
      JOIN entity_types ctype  ON ctype.id = c.entity_type_id AND ctype.name IN ('contract','supplement')
      JOIN relations r_loc     ON r_loc.from_entity_id = c.id AND r_loc.relation_type = 'located_in'
      JOIN entities b          ON b.id = r_loc.to_entity_id
      JOIN entity_types bt     ON bt.id = b.entity_type_id AND bt.name IN ('building','room','workshop','land_plot')
      LEFT JOIN entities e     ON e.parent_id = b.id AND e.deleted_at IS NULL
      LEFT JOIN entity_types et ON et.id = e.entity_type_id AND et.name IN ('equipment','crane_track')
      LEFT JOIN relations r_eq ON r_eq.from_entity_id = e.id AND r_eq.to_entity_id = b.id AND r_eq.relation_type = 'located_in'
      WHERE comp.deleted_at IS NULL
        AND (c.properties->>'contract_type' ILIKE '%Аренд%' OR c.properties->>'contract_type' ILIKE '%Субаренд%')
      ORDER BY comp.name, b.name, e.name
    `);

    const groups = {};
    rows.forEach(row => {
      const key = row.tenant_id;
      if (!groups[key]) groups[key] = { id: row.tenant_id, name: row.tenant_name, contracts: {}, items: [] };
      if (row.contract_id) groups[key].contracts[row.contract_id] = { id: row.contract_id, name: row.contract_name };
      if (row.eq_id && !groups[key].items.find(i => i.id === row.eq_id)) {
        groups[key].items.push({ id: row.eq_id, name: row.eq_name, icon: row.eq_icon, props: row.eq_props,
          building_id: row.building_id, building_name: row.building_name });
      }
    });
    return res.json({
      type,
      groups: Object.values(groups).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        .map(g => ({ ...g, contracts: Object.values(g.contracts) }))
    });
  }

  res.status(400).json({ error: 'Unknown report type. Use: equipment_by_location, equipment_by_tenant' });
}));

module.exports = router;
