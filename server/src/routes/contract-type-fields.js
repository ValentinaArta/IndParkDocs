const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
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

module.exports = router;
