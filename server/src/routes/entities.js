const express = require('express');
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { logAction } = require('../middleware/audit');
const xss = require('xss');

const router = express.Router();

function sanitizeObj(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    clean[k] = typeof v === 'string' ? xss(v) : v;
  }
  return clean;
}

// GET /api/entities
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { type, parent_id, search, limit = 50, offset = 0 } = req.query;
  const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const safeOffset = Math.max(parseInt(offset) || 0, 0);

  let sql = `SELECT e.*, et.name as type_name, et.name_ru as type_name_ru, et.icon, et.color,
    p.name as parent_name
    FROM entities e
    JOIN entity_types et ON e.entity_type_id = et.id
    LEFT JOIN entities p ON e.parent_id = p.id
    WHERE e.deleted_at IS NULL`;
  const params = [];

  if (type) {
    params.push(type);
    sql += ` AND et.name = $${params.length}`;
  }
  if (parent_id) {
    params.push(parseInt(parent_id));
    sql += ` AND e.parent_id = $${params.length}`;
  }
  if (search) {
    params.push('%' + search.replace(/[%_]/g, '\\$&') + '%');
    sql += ` AND (e.name ILIKE $${params.length})`;
  }
  sql += ' ORDER BY e.name';
  params.push(safeLimit);
  sql += ` LIMIT $${params.length}`;
  params.push(safeOffset);
  sql += ` OFFSET $${params.length}`;

  const { rows } = await pool.query(sql, params);
  res.json(rows);
}));

// GET /api/entities/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id || id < 1) return res.status(400).json({ error: 'Неверный ID' });

  const { rows: [entity] } = await pool.query(
    `SELECT e.*, et.name as type_name, et.name_ru as type_name_ru, et.icon, et.color
    FROM entities e JOIN entity_types et ON e.entity_type_id = et.id
    WHERE e.id=$1 AND e.deleted_at IS NULL`, [id]
  );
  if (!entity) return res.status(404).json({ error: 'Не найдено' });

  const { rows: children } = await pool.query(
    `SELECT e.*, et.name as type_name, et.name_ru as type_name_ru, et.icon, et.color
    FROM entities e JOIN entity_types et ON e.entity_type_id = et.id
    WHERE e.parent_id=$1 AND e.deleted_at IS NULL ORDER BY e.name`, [id]
  );

  const { rows: relations } = await pool.query(
    `SELECT r.*,
      fe.name as from_name, fet.icon as from_icon, fet.name_ru as from_type_ru,
      te.name as to_name, tet.icon as to_icon, tet.name_ru as to_type_ru,
      rt.name_ru as relation_name_ru, rt.color as relation_color
    FROM relations r
    JOIN entities fe ON r.from_entity_id = fe.id
    JOIN entity_types fet ON fe.entity_type_id = fet.id
    JOIN entities te ON r.to_entity_id = te.id
    JOIN entity_types tet ON te.entity_type_id = tet.id
    LEFT JOIN relation_types rt ON r.relation_type = rt.name
    WHERE (r.from_entity_id=$1 OR r.to_entity_id=$1) AND r.deleted_at IS NULL
    ORDER BY r.created_at DESC`, [id]
  );

  let parent = null;
  if (entity.parent_id) {
    const { rows: [p] } = await pool.query(
      `SELECT e.*, et.icon, et.name_ru as type_name_ru FROM entities e JOIN entity_types et ON e.entity_type_id = et.id WHERE e.id=$1`,
      [entity.parent_id]
    );
    parent = p;
  }

  const { rows: fields } = await pool.query(
    'SELECT * FROM field_definitions WHERE entity_type_id=$1 ORDER BY sort_order',
    [entity.entity_type_id]
  );

  res.json({ ...entity, children, relations, parent, fields });
}));

// POST /api/entities
router.post('/', authenticate, authorize('admin', 'editor'), validate(schemas.entity), asyncHandler(async (req, res) => {
  const { entity_type_id, name, properties, parent_id } = req.body;
  const cleanProps = sanitizeObj(properties);
  const cleanName = xss(name);

  const { rows } = await pool.query(
    'INSERT INTO entities (entity_type_id, name, properties, parent_id) VALUES ($1,$2,$3,$4) RETURNING *',
    [entity_type_id, cleanName, cleanProps, parent_id || null]
  );
  await logAction(req.user.id, 'create', 'entity', rows[0].id, { name: cleanName, entity_type_id }, req.ip);
  res.status(201).json(rows[0]);
}));

// PUT /api/entities/:id
router.put('/:id', authenticate, authorize('admin', 'editor'), validate(schemas.entityUpdate), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, properties, parent_id } = req.body;
  const cleanProps = properties ? sanitizeObj(properties) : undefined;
  const cleanName = name ? xss(name) : undefined;

  // Build dynamic update
  const sets = [];
  const params = [];
  if (cleanName !== undefined) { params.push(cleanName); sets.push(`name=$${params.length}`); }
  if (cleanProps !== undefined) { params.push(cleanProps); sets.push(`properties=$${params.length}`); }
  if (parent_id !== undefined) { params.push(parent_id); sets.push(`parent_id=$${params.length}`); }
  sets.push('updated_at=NOW()');
  params.push(id);

  const { rows } = await pool.query(
    `UPDATE entities SET ${sets.join(',')} WHERE id=$${params.length} AND deleted_at IS NULL RETURNING *`, params
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
  await logAction(req.user.id, 'update', 'entity', id, { name: cleanName }, req.ip);
  res.json(rows[0]);
}));

// DELETE /api/entities/:id (soft delete)
router.delete('/:id', authenticate, authorize('admin', 'editor'), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { rows } = await pool.query(
    'UPDATE entities SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING id, name', [id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
  await logAction(req.user.id, 'delete', 'entity', id, { name: rows[0].name }, req.ip);
  res.json({ ok: true });
}));

module.exports = router;
