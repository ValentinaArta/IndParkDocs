const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { rows: typeCounts } = await pool.query(
    `SELECT et.name, et.name_ru, et.icon, et.color, COUNT(e.id)::int as count
    FROM entity_types et LEFT JOIN entities e ON et.id = e.entity_type_id AND e.deleted_at IS NULL
    GROUP BY et.id ORDER BY et.sort_order`
  );
  const { rows: [{ count: relationCount }] } = await pool.query(
    'SELECT COUNT(*)::int as count FROM relations WHERE deleted_at IS NULL'
  );
  res.json({ types: typeCounts, totalRelations: relationCount });
}));

module.exports = router;
