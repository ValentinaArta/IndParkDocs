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
  fields.forEach(f => allFields.set(f.name, { name: f.name, name_ru: f.name_ru, field_type: f.field_type, source: f.entity_type_ru }));
  propKeys.forEach(pk => {
    if (!allFields.has(pk.key)) {
      allFields.set(pk.key, { name: pk.key, name_ru: pk.key, field_type: 'text', source: 'properties' });
    }
  });

  res.json(Array.from(allFields.values()));
}));

module.exports = router;
