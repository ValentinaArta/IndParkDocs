const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const pool = require('../db');
const logger = require('../logger');

const router = Router();

// GET /api/contract-type-fields — returns { "Аренды": [...], "Услуг": [...], ... }
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT contract_type, field_name, name_ru, field_type, options, field_group, is_readonly
       FROM contract_type_fields
       ORDER BY contract_type, sort_order`
    );
    const result = {};
    for (const r of rows) {
      if (!result[r.contract_type]) result[r.contract_type] = [];
      const field = { name: r.field_name, name_ru: r.name_ru, field_type: r.field_type };
      if (r.options) field.options = r.options;
      if (r.field_group) field._group = r.field_group;
      if (r.is_readonly) field._readonly = true;
      result[r.contract_type].push(field);
    }
    res.json(result);
  } catch (e) {
    logger.error({ msg: 'contract-type-fields GET error', err: e.message });
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/contract-type-fields/all — flat list with IDs for admin
router.get('/all', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, contract_type, field_name, name_ru, field_type, options, field_group, is_readonly, sort_order
       FROM contract_type_fields ORDER BY contract_type, sort_order`
    );
    res.json(rows);
  } catch (e) {
    logger.error({ msg: 'contract-type-fields /all error', err: e.message });
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/contract-type-fields/types — distinct contract types
router.get('/types', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT contract_type FROM contract_type_fields ORDER BY contract_type`
    );
    res.json(rows.map(r => r.contract_type));
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/contract-type-fields — add field
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { contract_type, field_name, name_ru, field_type, options, field_group, is_readonly, sort_order } = req.body;
    if (!contract_type || !field_name || !name_ru || !field_type) {
      return res.status(400).json({ error: 'contract_type, field_name, name_ru, field_type required' });
    }
    const { rows } = await pool.query(
      `INSERT INTO contract_type_fields (contract_type, field_name, name_ru, field_type, options, field_group, is_readonly, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (contract_type, field_name) DO UPDATE SET
         name_ru=EXCLUDED.name_ru, field_type=EXCLUDED.field_type, options=EXCLUDED.options,
         field_group=EXCLUDED.field_group, is_readonly=EXCLUDED.is_readonly, sort_order=EXCLUDED.sort_order
       RETURNING *`,
      [contract_type, field_name, name_ru, field_type, options ? JSON.stringify(options) : null, field_group || null, !!is_readonly, sort_order || 0]
    );
    res.json(rows[0]);
  } catch (e) {
    logger.error({ msg: 'contract-type-fields POST error', err: e.message });
    res.status(500).json({ error: 'Internal error' });
  }
});

// PUT /api/contract-type-fields/:id — update field
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { contract_type, field_name, name_ru, field_type, options, field_group, is_readonly, sort_order } = req.body;
    const { rows } = await pool.query(
      `UPDATE contract_type_fields SET
         contract_type=$2, field_name=$3, name_ru=$4, field_type=$5,
         options=$6, field_group=$7, is_readonly=$8, sort_order=$9
       WHERE id=$1 RETURNING *`,
      [req.params.id, contract_type, field_name, name_ru, field_type, options ? JSON.stringify(options) : null, field_group || null, !!is_readonly, sort_order || 0]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    logger.error({ msg: 'contract-type-fields PUT error', err: e.message });
    res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /api/contract-type-fields/:id
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM contract_type_fields WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    logger.error({ msg: 'contract-type-fields DELETE error', err: e.message });
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
