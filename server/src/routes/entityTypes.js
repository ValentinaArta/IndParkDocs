const express = require('express');
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { logAction } = require('../middleware/audit');

const router = express.Router();

// ── Helper: inject options array from field_option_values ────────────────────
async function injectOptions(fields) {
  if (!fields.length) return fields;
  const ids = fields.map(f => f.id);
  const { rows: opts } = await pool.query(
    `SELECT field_definition_id, value
     FROM field_option_values
     WHERE field_definition_id = ANY($1)
     ORDER BY field_definition_id, sort_order`,
    [ids]
  );
  const byField = {};
  for (const o of opts) {
    if (!byField[o.field_definition_id]) byField[o.field_definition_id] = [];
    byField[o.field_definition_id].push(o.value);
  }
  return fields.map(f => ({
    ...f,
    options: byField[f.id] || (f.options ? (Array.isArray(f.options) ? f.options : []) : []),
  }));
}

// ── Helper: save options to field_option_values (+ sync fd.options) ──────────
async function saveOptions(fieldId, options) {
  if (!Array.isArray(options)) return;
  await pool.query('DELETE FROM field_option_values WHERE field_definition_id=$1', [fieldId]);
  for (let i = 0; i < options.length; i++) {
    const v = String(options[i]).trim();
    if (!v) continue;
    await pool.query(
      `INSERT INTO field_option_values (field_definition_id, value, sort_order)
       VALUES ($1,$2,$3) ON CONFLICT (field_definition_id, value) DO UPDATE SET sort_order=EXCLUDED.sort_order`,
      [fieldId, v, i]
    );
  }
  // Keep fd.options in sync for backward compat (reports, filters that read directly)
  await pool.query(
    'UPDATE field_definitions SET options=$1::jsonb WHERE id=$2',
    [JSON.stringify(options), fieldId]
  );
}

// ── Entity types ─────────────────────────────────────────────────────────────

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM entity_types ORDER BY sort_order');
  res.json(rows);
}));

router.post('/', authenticate, authorize('admin'), validate(schemas.entityType), asyncHandler(async (req, res) => {
  const { name, name_ru, icon, color } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO entity_types (name, name_ru, icon, color) VALUES ($1,$2,$3,$4) RETURNING *',
    [name, name_ru, icon, color]
  );
  await logAction(req.user.id, 'create', 'entity_type', rows[0].id, { name, name_ru }, req.ip);
  res.status(201).json(rows[0]);
}));

router.put('/:id', authenticate, authorize('admin'), validate(schemas.entityTypeUpdate), asyncHandler(async (req, res) => {
  const { name_ru, icon, color } = req.body;
  const { rows } = await pool.query(
    'UPDATE entity_types SET name_ru=COALESCE($1,name_ru), icon=COALESCE($2,icon), color=COALESCE($3,color) WHERE id=$4 RETURNING *',
    [name_ru, icon, color, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
  res.json(rows[0]);
}));

// ── Field definitions ─────────────────────────────────────────────────────────

router.get('/:typeId/fields', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM field_definitions WHERE entity_type_id=$1 ORDER BY sort_order',
    [req.params.typeId]
  );
  res.json(await injectOptions(rows));
}));

router.post('/:typeId/fields', authenticate, authorize('admin'), validate(schemas.fieldDefinition), asyncHandler(async (req, res) => {
  const { name, name_ru, field_type, options, required } = req.body;
  const optJson = Array.isArray(options) && options.length ? JSON.stringify(options) : null;
  const { rows } = await pool.query(
    'INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, options, required) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.params.typeId, name, name_ru, field_type, optJson, required]
  );
  if (Array.isArray(options) && options.length) {
    await saveOptions(rows[0].id, options);
  }
  res.status(201).json({ ...rows[0], options: options || [] });
}));

router.delete('/fields/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  // field_option_values cascade-deletes via FK
  await pool.query('DELETE FROM field_definitions WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
}));

// ── Справочники (Reference Lists) ────────────────────────────────────────────

// GET /api/entity-types/settings/lists — all editable select/select_or_custom fields
router.get('/settings/lists', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT fd.id, fd.name, fd.name_ru, fd.field_type, fd.sort_order,
           et.id AS entity_type_id, et.name AS entity_type_name, et.name_ru AS entity_type_name_ru, et.icon
    FROM field_definitions fd
    JOIN entity_types et ON et.id = fd.entity_type_id
    WHERE fd.field_type IN ('select', 'select_or_custom')
    ORDER BY et.sort_order, fd.sort_order
  `);

  // Filter to fields that actually have options (from new table)
  const withOptions = await injectOptions(rows);
  res.json(withOptions.filter(f => f.options && f.options.length > 0));
}));

// PATCH /api/entity-types/settings/lists/:fieldId — update options for a field
router.patch('/settings/lists/:fieldId', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { options } = req.body;
  if (!Array.isArray(options)) return res.status(400).json({ error: 'options must be array' });

  await saveOptions(parseInt(req.params.fieldId), options);

  const { rows } = await pool.query('SELECT * FROM field_definitions WHERE id=$1', [req.params.fieldId]);
  if (rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
  res.json({ ...rows[0], options });
}));

module.exports = router;
