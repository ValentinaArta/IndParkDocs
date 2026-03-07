'use strict';
const express = require('express');
const pool = require('../../db');
const { authenticate } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

const router = express.Router();

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

// GET /api/reports/broken-equipment — returns IDs of equipment marked broken in their latest act
router.get('/broken-equipment', authenticate, asyncHandler(async (req, res) => {
  const sql = `
    SELECT DISTINCT ON (r.from_entity_id)
      r.from_entity_id          AS eq_id,
      a.properties->>'act_items' AS act_items
    FROM relations r
    JOIN entities a  ON a.id = r.to_entity_id AND a.deleted_at IS NULL
    JOIN entity_types at ON a.entity_type_id = at.id AND at.name = 'act'
    WHERE r.relation_type = 'subject_of'
    ORDER BY r.from_entity_id,
             (a.properties->>'act_date') DESC NULLS LAST,
             a.id DESC`;

  const result = await pool.query(sql);
  const brokenIds = [];

  result.rows.forEach(function(row) {
    let items = [];
    try { items = JSON.parse(row.act_items || '[]'); } catch(e) {}
    const item = items.find(function(i) { return parseInt(i.equipment_id) === row.eq_id; });
    if (item && (item.broken === true || item.broken === 'true')) {
      brokenIds.push(row.eq_id);
    }
  });

  res.json(brokenIds);
}));

module.exports = router;
