const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── Helper: safe numeric ─────────────────────────────────────────────────────
function safeNum(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

// ── Dimension extractors ────────────────────────────────────────────────────
function extractDim(row, dim) {
  const p = row.props || {};
  switch (dim) {
    case 'contract_type':  return p.contract_type  || '—';
    case 'counterparty':   return p.contractor_name || p.subtenant_name || '—';
    case 'our_company':    return p.our_legal_entity || '—';
    case 'building':       return row.building_name  || '—';
    case 'period_month':   return (p.contract_date || '').substring(0, 7) || '—';
    case 'period_quarter': {
      const d = p.contract_date || '';
      const m = parseInt(d.substring(5, 7));
      const y = d.substring(0, 4);
      if (!y || !m) return '—';
      return y + ' Q' + Math.ceil(m / 3);
    }
    case 'period_year':    return (p.contract_date || '').substring(0, 4) || '—';
    default:               return '—';
  }
}

// ── Measure extractors ───────────────────────────────────────────────────────
function extractMeasure(row, measure) {
  const p = row.props || {};
  switch (measure) {
    case 'amount': return safeNum(p.contract_amount);
    case 'count':  return 1;
    case 'area':   return safeNum(p.total_area);
    default:       return 0;
  }
}

// GET /api/cube/data
router.get('/data', authenticate, asyncHandler(async (req, res) => {
  const { rowDim = 'contract_type', colDim = 'period_month', measure = 'amount' } = req.query;

  // Fetch all contracts with optional building from relations
  const { rows } = await pool.query(`
    SELECT
      e.id,
      e.properties AS props,
      b.name        AS building_name
    FROM entities e
    JOIN entity_types et ON et.id = e.entity_type_id AND et.name = 'contract'
    LEFT JOIN relations r
      ON r.from_entity_id = e.id AND r.relation_type = 'located_in'
    LEFT JOIN entities b
      ON b.id = r.to_entity_id AND b.deleted_at IS NULL
      AND EXISTS (SELECT 1 FROM entity_types et2 WHERE et2.id = b.entity_type_id AND et2.name = 'building')
    WHERE e.deleted_at IS NULL
  `);

  // Build cube in JS (aggregate by rowKey × colKey)
  const rowSet   = new Map(); // key → label
  const colSet   = new Map();
  const cells    = {};        // rowKey → colKey → value
  const totalsRow = {};
  const totalsCol = {};
  let grand = 0;

  for (const row of rows) {
    const rKey = extractDim(row, rowDim);
    const cKey = extractDim(row, colDim);
    const val  = extractMeasure(row, measure);

    if (!rowSet.has(rKey)) rowSet.set(rKey, rKey);
    if (!colSet.has(cKey)) colSet.set(cKey, cKey);

    if (!cells[rKey]) cells[rKey] = {};
    if (measure === 'count') {
      cells[rKey][cKey] = (cells[rKey][cKey] || 0) + 1;
    } else {
      cells[rKey][cKey] = (cells[rKey][cKey] || 0) + val;
    }

    totalsRow[rKey] = (totalsRow[rKey] || 0) + val;
    totalsCol[cKey] = (totalsCol[cKey] || 0) + val;
    grand += val;
  }

  // Sort rows and cols
  const sortedRowKeys = _sortDimKeys([...rowSet.keys()], rowDim);
  const sortedColKeys = _sortDimKeys([...colSet.keys()], colDim);

  res.json({
    rows:      sortedRowKeys.map(k => ({ key: k, label: k })),
    cols:      sortedColKeys.map(k => ({ key: k, label: k })),
    cells,
    totalsRow,
    totalsCol,
    grand,
    measure,
    rowDim,
    colDim,
  });
}));

function _sortDimKeys(keys, dim) {
  if (dim.startsWith('period_')) {
    // Chronological sort
    return keys.slice().sort((a, b) => {
      if (a === '—') return 1;
      if (b === '—') return -1;
      return a < b ? -1 : a > b ? 1 : 0;
    });
  }
  // Alphabetical, '—' last
  return keys.slice().sort((a, b) => {
    if (a === '—') return 1;
    if (b === '—') return -1;
    return a.localeCompare(b, 'ru');
  });
}

module.exports = router;
