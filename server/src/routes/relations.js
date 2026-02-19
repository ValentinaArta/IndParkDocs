const express = require('express');
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { logAction } = require('../middleware/audit');

const router = express.Router();

router.get('/types', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM relation_types ORDER BY name_ru');
  res.json(rows);
}));

router.post('/types', authenticate, authorize('admin'), validate(schemas.relationType), asyncHandler(async (req, res) => {
  const { name, name_ru, color } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO relation_types (name, name_ru, color) VALUES ($1,$2,$3) RETURNING *',
    [name, name_ru, color]
  );
  res.status(201).json(rows[0]);
}));

router.post('/', authenticate, authorize('admin', 'editor'), validate(schemas.relation), asyncHandler(async (req, res) => {
  const { from_entity_id, to_entity_id, relation_type, properties } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO relations (from_entity_id, to_entity_id, relation_type, properties) VALUES ($1,$2,$3,$4) RETURNING *',
    [from_entity_id, to_entity_id, relation_type, properties]
  );
  await logAction(req.user.id, 'create', 'relation', rows[0].id, { from_entity_id, to_entity_id, relation_type }, req.ip);
  res.status(201).json(rows[0]);
}));

router.delete('/:id', authenticate, authorize('admin', 'editor'), asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'UPDATE relations SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING id', [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
  await logAction(req.user.id, 'delete', 'relation', rows[0].id, null, req.ip);
  res.json({ ok: true });
}));

module.exports = router;
