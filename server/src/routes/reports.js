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

// GET /api/reports/aggregate — equipment costs grouped by contracts + acts
router.get('/aggregate', authenticate, asyncHandler(async (req, res) => {
  const { contract_types, metric, date_from, date_to, contractor_id } = req.query;
  const types = contract_types ? contract_types.split('|').filter(Boolean) : [];
  if (types.length === 0) return res.status(400).json({ error: 'Укажите тип договора' });

  const buildExtra = (params, prefix) => {
    let extra = '';
    if (date_from) { params.push(date_from); extra += ` AND (${prefix}.properties->>'contract_date') >= $${params.length}`; }
    if (date_to)   { params.push(date_to);   extra += ` AND (${prefix}.properties->>'contract_date') <= $${params.length}`; }
    if (contractor_id) { params.push(parseInt(contractor_id)); extra += ` AND (${prefix}.properties->>'contractor_id')::int = $${params.length}`; }
    return extra;
  };

  const mapRow = (r, amount) => {
    const ep = r.eq_props || {};
    const cp = r.contract_props || {};
    return {
      eq_id: r.eq_id, eq_name: r.eq_name,
      eq_building: r.building_name || '—',
      eq_category: ep.equipment_category || '',
      eq_balance_owner: ep.balance_owner_name || '',
      eq_status: ep.status || '',
      contract_id: r.contract_id, contract_name: r.contract_name,
      act_id: r.act_id || null, act_name: r.act_name || null, act_date: r.act_date || null,
      contract_our_legal_entity: cp.our_legal_entity || '',
      contract_contractor: cp.contractor_name || '',
      contract_type: cp.contract_type || '',
      contract_date: cp.contract_date || '',
      contract_year: (cp.contract_date || '').substring(0, 4),
      contract_amount: amount,
      rent_monthly: parseFloat(cp.rent_monthly) || 0,
    };
  };

  // Path 1: equipment → subject_of → contract (direct)
  const p1 = [types];
  const sql1 = `
    SELECT e.id AS eq_id, e.name AS eq_name, e.properties AS eq_props,
      par.name AS building_name,
      c.id AS contract_id, c.name AS contract_name, c.properties AS contract_props,
      NULL::int AS act_id, NULL::text AS act_name, NULL::text AS act_date
    FROM entities e
    JOIN entity_types et_e ON e.entity_type_id = et_e.id AND et_e.name = 'equipment'
    JOIN relations r ON r.from_entity_id = e.id AND r.relation_type = 'subject_of'
    JOIN entities c ON c.id = r.to_entity_id AND c.deleted_at IS NULL
    JOIN entity_types et_c ON c.entity_type_id = et_c.id AND et_c.name = 'contract'
    LEFT JOIN entities par ON par.id = e.parent_id AND par.deleted_at IS NULL
    WHERE e.deleted_at IS NULL AND c.properties->>'contract_type' = ANY($1)
    ${buildExtra(p1, 'c')} ORDER BY e.name, c.id`;
  const r1 = await pool.query(sql1, p1);
  const rows1 = r1.rows.map(r => mapRow(r, parseFloat((r.contract_props || {}).contract_amount) || 0));

  // Path 2: equipment → subject_of → act → supplement_to → contract
  const p2 = [types];
  const sql2 = `
    SELECT e.id AS eq_id, e.name AS eq_name, e.properties AS eq_props,
      par.name AS building_name,
      c.id AS contract_id, c.name AS contract_name, c.properties AS contract_props,
      act.id AS act_id, act.name AS act_name,
      act.properties->>'act_date' AS act_date,
      act.properties AS act_props
    FROM entities e
    JOIN entity_types et_e ON e.entity_type_id = et_e.id AND et_e.name = 'equipment'
    JOIN relations r ON r.from_entity_id = e.id AND r.relation_type = 'subject_of'
    JOIN entities act ON act.id = r.to_entity_id AND act.deleted_at IS NULL
    JOIN entity_types et_act ON act.entity_type_id = et_act.id AND et_act.name = 'act'
    JOIN relations r2 ON r2.from_entity_id = act.id AND r2.relation_type = 'supplement_to'
    JOIN entities c ON c.id = r2.to_entity_id AND c.deleted_at IS NULL
    JOIN entity_types et_c ON c.entity_type_id = et_c.id AND et_c.name = 'contract'
    LEFT JOIN entities par ON par.id = e.parent_id AND par.deleted_at IS NULL
    WHERE e.deleted_at IS NULL AND c.properties->>'contract_type' = ANY($1)
    ${buildExtra(p2, 'c')} ORDER BY e.name, act.id`;
  const r2 = await pool.query(sql2, p2);
  const rows2 = r2.rows.map(r => {
    // Find per-equipment amount from act_items
    let items = [];
    try { items = JSON.parse((r.act_props || {}).act_items || '[]'); } catch(e) {}
    const item = items.find(i => parseInt(i.equipment_id) === r.eq_id);
    const amount = item ? (parseFloat(item.amount) || 0) : 0;
    return mapRow(r, amount);
  });

  res.json([...rows1, ...rows2]);
}));

// GET /api/reports/rent-analysis — flat rows from Аренды/Субаренды contracts, expanded from rent_objects
router.get('/rent-analysis', authenticate, asyncHandler(async (req, res) => {
  const sql = `
    SELECT e.id, e.name,
      e.properties->>'contract_type'     AS contract_type,
      e.properties->>'number'            AS contract_number,
      e.properties->>'contract_date'     AS contract_date,
      e.properties->>'contract_end_date' AS contract_end_date,
      e.properties->>'our_legal_entity'  AS our_legal_entity,
      e.properties->>'contractor_name'   AS contractor_name,
      e.properties->>'subtenant_name'    AS subtenant_name,
      e.properties->>'vat_rate'          AS vat_rate,
      e.properties->>'rent_objects'      AS rent_objects
    FROM entities e
    JOIN entity_types et ON e.entity_type_id = et.id AND et.name = 'contract'
    WHERE e.deleted_at IS NULL
      AND e.properties->>'contract_type' IN ('Аренды','Субаренды')
    ORDER BY e.properties->>'contract_date', e.name`;

  const result = await pool.query(sql);
  const rows = [];
  let seq = 0;

  result.rows.forEach(function(c) {
    let roList = [];
    try { roList = JSON.parse(c.rent_objects || '[]'); } catch(e) {}
    if (!Array.isArray(roList) || roList.length === 0) {
      // Contract with no rent_objects — include as single row
      seq++;
      rows.push({
        seq, contract_id: c.id, contract_name: c.name,
        contract_type: c.contract_type || '', contract_number: c.contract_number || '',
        contract_date: c.contract_date || '', contract_end_date: c.contract_end_date || '',
        our_legal_entity: c.our_legal_entity || '', contractor_name: c.contractor_name || '',
        subtenant_name: c.subtenant_name || '', vat_rate: parseFloat(c.vat_rate) || 0,
        object_type: '', building: '', rent_scope: '',
        area: 0, rent_rate: 0, annual_amount: 0, monthly_amount: 0, comment: ''
      });
      return;
    }
    roList.forEach(function(ro) {
      seq++;
      const area = parseFloat(ro.area) || 0;
      const rate = parseFloat(ro.rent_rate) || 0;
      const annual = area * rate;
      rows.push({
        seq, contract_id: c.id, contract_name: c.name,
        contract_type: c.contract_type || '', contract_number: c.contract_number || '',
        contract_date: c.contract_date || '', contract_end_date: c.contract_end_date || '',
        our_legal_entity: c.our_legal_entity || '', contractor_name: c.contractor_name || '',
        subtenant_name: c.subtenant_name || '', vat_rate: parseFloat(c.vat_rate) || 0,
        object_type: ro.object_type || '', building: ro.building || '',
        rent_scope: ro.rent_scope || '',
        area, rent_rate: rate, annual_amount: annual, monthly_amount: annual / 12,
        comment: ro.comment || '', room: ro.room || ''
      });
    });
  });

  res.json(rows);
}));

// GET /api/reports/work-history — equipment × act work descriptions matrix
router.get('/work-history', authenticate, asyncHandler(async (req, res) => {
  const { category, building_id, date_from, date_to } = req.query;

  const params = [];
  let where = '';
  if (category) {
    params.push(category);
    where += ` AND e.properties->>'equipment_category' = $${params.length}`;
  }
  if (building_id) {
    params.push(parseInt(building_id));
    where += ` AND (e.parent_id = $${params.length} OR EXISTS (
      SELECT 1 FROM relations rl WHERE rl.from_entity_id = e.id AND rl.relation_type = 'located_in' AND rl.to_entity_id = $${params.length}
    ))`;
  }
  if (date_from) { params.push(date_from); where += ` AND (act.properties->>'act_date') >= $${params.length}`; }
  if (date_to)   { params.push(date_to);   where += ` AND (act.properties->>'act_date') <= $${params.length}`; }

  const sql = `
    SELECT
      e.id AS eq_id, e.name AS eq_name, e.properties AS eq_props,
      par.id AS building_id, par.name AS building_name,
      act.id AS act_id, act.name AS act_name,
      act.properties->>'act_date' AS act_date,
      act.properties->>'act_number' AS act_number,
      act.properties AS act_props
    FROM entities act
    JOIN entity_types et_act ON act.entity_type_id = et_act.id AND et_act.name = 'act'
    JOIN relations r_eq ON r_eq.to_entity_id = act.id AND r_eq.relation_type = 'subject_of'
    JOIN entities e ON e.id = r_eq.from_entity_id AND e.deleted_at IS NULL
    JOIN entity_types et_e ON e.entity_type_id = et_e.id AND et_e.name = 'equipment'
    LEFT JOIN entities par ON par.id = e.parent_id AND par.deleted_at IS NULL
    WHERE act.deleted_at IS NULL ${where}
    ORDER BY e.name, act.properties->>'act_date'`;

  const result = await pool.query(sql, params);

  const rows = result.rows.map(r => {
    const ep = r.eq_props || {};
    const ap = r.act_props || {};
    let items = [];
    try { items = JSON.parse(ap.act_items || '[]'); } catch(e) {}
    const item = items.find(i => parseInt(i.equipment_id) === r.eq_id);
    return {
      eq_id: r.eq_id,
      eq_name: r.eq_name,
      eq_inv_number: ep.inv_number || '',
      eq_category: ep.equipment_category || '',
      eq_status: ep.status || '',
      building_id: r.building_id,
      building_name: r.building_name || '—',
      act_id: r.act_id,
      act_name: r.act_name,
      act_date: r.act_date || '',
      act_number: r.act_number || '',
      description: item ? (item.description || '') : '',
      comment: item ? (item.comment || '') : '',
      amount: item ? (parseFloat(item.amount) || 0) : 0,
    };
  });

  res.json(rows);
}));

module.exports = router;
