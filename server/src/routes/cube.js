const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { authenticate } = require('../middleware/auth');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── Dimension registry ──────────────────────────────────────────────────────
// group: 'contract' → use contract-primary fact query
// group: 'equipment' → use equipment-primary fact query
const DIM_META = {
  contract_type:      { group: 'contract',   col: 'contract_type' },
  our_company:        { group: 'contract',   col: 'our_company' },
  doc_status:         { group: 'contract',   col: 'doc_status' },
  period_month:       { group: 'contract',   col: 'period_month' },
  period_quarter:     { group: 'contract',   col: 'period_quarter' },
  period_year:        { group: 'contract',   col: 'period_year' },
  contractor_name:    { group: 'contract',   col: 'contractor_name' },
  building_name:      { group: 'contract',   col: 'building_name' },
  equipment_name:     { group: 'equipment',  col: 'equipment_name' },
  equipment_status:   { group: 'equipment',  col: 'equipment_status' },
  equipment_category: { group: 'equipment',  col: 'equipment_category' },
  equipment_kind:     { group: 'equipment',  col: 'equipment_kind' },
};

// ── Contract-primary fact ───────────────────────────────────────────────────
// Grain: one row per contract. Building = first located_in building.
const CONTRACT_FACT_SQL = `
WITH cbase AS (
  SELECT e.id AS contract_id, e.name AS contract_name, e.properties AS p
  FROM entities e
  JOIN entity_types et ON et.id = e.entity_type_id AND et.name = 'contract'
  WHERE e.deleted_at IS NULL
),
cbld AS (
  SELECT DISTINCT ON (r.from_entity_id)
    r.from_entity_id AS contract_id, b.name AS building_name, b.id AS building_id
  FROM relations r
  JOIN entities b ON b.id = r.to_entity_id AND b.deleted_at IS NULL
  JOIN entity_types et ON et.id = b.entity_type_id AND et.name IN ('building','workshop')
  WHERE r.relation_type = 'located_in'
  ORDER BY r.from_entity_id
)
SELECT
  cb.contract_id,
  cb.contract_name,
  cb.p->>'contract_type'    AS contract_type,
  cb.p->>'contractor_name'  AS contractor_name,
  cb.p->>'our_legal_entity' AS our_company,
  cb.p->>'doc_status'       AS doc_status,
  CASE WHEN cb.p->>'contract_date' ~ '^[0-9]{4}-[0-9]{2}'
    THEN LEFT(cb.p->>'contract_date', 7) END AS period_month,
  CASE WHEN cb.p->>'contract_date' ~ '^[0-9]{4}-[0-9]{2}'
    THEN LEFT(cb.p->>'contract_date', 4) || ' Q' ||
         CEIL(EXTRACT(MONTH FROM (cb.p->>'contract_date')::date) / 3.0)::int::text
    END AS period_quarter,
  CASE WHEN cb.p->>'contract_date' ~ '^[0-9]{4}'
    THEN LEFT(cb.p->>'contract_date', 4) END AS period_year,
  COALESCE(NULLIF(cb.p->>'contract_amount',''),'0')::numeric AS contract_amount,
  bld.building_name
FROM cbase cb
LEFT JOIN cbld bld ON bld.contract_id = cb.contract_id
`;

// ── Equipment-primary fact ──────────────────────────────────────────────────
// Grain: one row per (equipment × contract) pair. No contract → one row with NULLs.
const EQUIPMENT_FACT_SQL = `
WITH eqbase AS (
  SELECT e.id AS equipment_id, e.name AS equipment_name, e.properties AS p
  FROM entities e
  JOIN entity_types et ON et.id = e.entity_type_id AND et.name = 'equipment'
  WHERE e.deleted_at IS NULL
),
eq_via_rel AS (
  SELECT r.from_entity_id AS equipment_id, r.to_entity_id AS contract_id
  FROM relations r WHERE r.relation_type = 'subject_of'
),
eq_via_transfer AS (
  SELECT (te->>'equipment_id')::int AS equipment_id, c.id AS contract_id
  FROM entities c
  JOIN entity_types et ON et.id = c.entity_type_id AND et.name = 'contract'
  LEFT JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN c.properties->>'transfer_equipment' IS NOT NULL
       AND c.properties->>'transfer_equipment' NOT IN ('','null')
       AND c.properties->>'transfer_equipment' ~ '^\\s*\\['
      THEN (c.properties->>'transfer_equipment')::jsonb
      ELSE '[]'::jsonb
    END
  ) AS te ON true
  WHERE c.deleted_at IS NULL
    AND (te->>'equipment_id') IS NOT NULL
    AND (te->>'equipment_id') <> ''
),
eq_contracts AS (
  SELECT DISTINCT equipment_id, contract_id FROM eq_via_rel
  UNION
  SELECT equipment_id, contract_id FROM eq_via_transfer
  WHERE equipment_id IS NOT NULL
),
eq_bld AS (
  SELECT DISTINCT ON (r.from_entity_id)
    r.from_entity_id AS equipment_id, b.name AS building_name, b.id AS building_id
  FROM relations r
  JOIN entities b ON b.id = r.to_entity_id AND b.deleted_at IS NULL
  JOIN entity_types et ON et.id = b.entity_type_id AND et.name IN ('building','workshop')
  WHERE r.relation_type = 'located_in'
  ORDER BY r.from_entity_id
),
cmeta AS (
  SELECT
    e.id AS contract_id, e.name AS contract_name,
    e.properties->>'contractor_name'  AS contractor_name,
    e.properties->>'our_legal_entity' AS our_company,
    e.properties->>'contract_type'    AS contract_type,
    e.properties->>'doc_status'       AS doc_status,
    CASE WHEN e.properties->>'contract_date' ~ '^[0-9]{4}-[0-9]{2}'
      THEN LEFT(e.properties->>'contract_date', 7) END AS period_month,
    CASE WHEN e.properties->>'contract_date' ~ '^[0-9]{4}-[0-9]{2}'
      THEN LEFT(e.properties->>'contract_date', 4) || ' Q' ||
           CEIL(EXTRACT(MONTH FROM (e.properties->>'contract_date')::date) / 3.0)::int::text
      END AS period_quarter,
    CASE WHEN e.properties->>'contract_date' ~ '^[0-9]{4}'
      THEN LEFT(e.properties->>'contract_date', 4) END AS period_year,
    COALESCE(NULLIF(e.properties->>'contract_amount',''),'0')::numeric AS contract_amount
  FROM entities e
  JOIN entity_types et ON et.id = e.entity_type_id AND et.name = 'contract'
  WHERE e.deleted_at IS NULL
)
SELECT
  eq.equipment_id,
  eq.equipment_name,
  eq.p->>'status'             AS equipment_status,
  eq.p->>'equipment_category' AS equipment_category,
  eq.p->>'equipment_kind'     AS equipment_kind,
  cm.contract_id,
  cm.contract_name,
  cm.contractor_name,
  cm.our_company,
  cm.contract_type,
  cm.doc_status,
  cm.period_month,
  cm.period_quarter,
  cm.period_year,
  cm.contract_amount,
  eqb.building_name
FROM eqbase eq
LEFT JOIN eq_contracts ec  ON ec.equipment_id  = eq.equipment_id
LEFT JOIN cmeta cm          ON cm.contract_id   = ec.contract_id
LEFT JOIN eq_bld eqb        ON eqb.equipment_id = eq.equipment_id
`;

// ── Pivot builder ───────────────────────────────────────────────────────────
function buildPivot(rows, rowCol, colCol, isEqPrimary) {
  const rowKeys = new Map();
  const colKeys = new Map();
  const cells   = {};

  for (const row of rows) {
    const rKey = (row[rowCol] != null) ? String(row[rowCol]) : '\u2014';
    const cKey = (row[colCol] != null) ? String(row[colCol]) : '\u2014';

    if (!rowKeys.has(rKey)) rowKeys.set(rKey, true);
    if (!colKeys.has(cKey)) colKeys.set(cKey, true);

    if (!cells[rKey])       cells[rKey] = {};
    if (!cells[rKey][cKey]) cells[rKey][cKey] = {
      contractIds:  new Set(),
      equipmentIds: new Set(),
      names:        new Set(),
    };

    const c = cells[rKey][cKey];
    if (row.contract_id)   c.contractIds.add(row.contract_id);
    if (row.equipment_id)  c.equipmentIds.add(row.equipment_id);
    if (isEqPrimary && row.equipment_name) c.names.add(row.equipment_name);
    else if (!isEqPrimary && row.contractor_name) c.names.add(row.contractor_name);
  }

  // Compute amounts: avoid double-counting by using unique contract amounts
  const contractAmounts = {};
  for (const row of rows) {
    if (row.contract_id && row.contract_amount > 0)
      contractAmounts[row.contract_id] = parseFloat(row.contract_amount) || 0;
  }

  const serial = {};
  for (const [rKey, rCells] of Object.entries(cells)) {
    serial[rKey] = {};
    for (const [cKey, c] of Object.entries(rCells)) {
      const contractIds  = [...c.contractIds];
      const equipmentIds = [...c.equipmentIds];
      let sum = 0;
      for (const cid of contractIds) sum += contractAmounts[cid] || 0;
      serial[rKey][cKey] = {
        count: isEqPrimary ? (equipmentIds.length || contractIds.length) : contractIds.length,
        sum: Math.round(sum),
        names: [...c.names].slice(0, 8),
        contractIds,
        equipmentIds,
      };
    }
  }

  // Sort keys
  const sort = (a, b) => {
    if (a === '\u2014') return 1;
    if (b === '\u2014') return -1;
    if (/^\d{4}/.test(a) && /^\d{4}/.test(b)) return a < b ? -1 : a > b ? 1 : 0;
    return String(a).localeCompare(String(b), 'ru');
  };

  return {
    rows: [...rowKeys.keys()].sort(sort).map(k => ({ key: k })),
    cols: [...colKeys.keys()].sort(sort).map(k => ({ key: k })),
    cells: serial,
  };
}

// ── POST /api/cube/query ────────────────────────────────────────────────────
router.post('/query', authenticate, asyncHandler(async (req, res) => {
  const { rowDim, colDim } = req.body;
  if (!rowDim || !colDim)
    return res.status(400).json({ error: 'rowDim and colDim required' });
  if (!DIM_META[rowDim] || !DIM_META[colDim])
    return res.status(400).json({ error: 'Unknown dimension: ' + [rowDim, colDim].join(', ') });

  const rMeta = DIM_META[rowDim];
  const cMeta = DIM_META[colDim];
  const isEq  = rMeta.group === 'equipment' || cMeta.group === 'equipment';
  const sql   = isEq ? EQUIPMENT_FACT_SQL : CONTRACT_FACT_SQL;

  const { rows } = await pool.query(sql);
  const pivot = buildPivot(rows, rMeta.col, cMeta.col, isEq);

  res.json({ ...pivot, rowDim, colDim, factRows: rows.length });
}));

// ── GET /api/cube/drilldown ─────────────────────────────────────────────────
router.get('/drilldown', authenticate, asyncHandler(async (req, res) => {
  const cIds = (req.query.contractIds  || '').split(',').map(Number).filter(Boolean);
  const eIds = (req.query.equipmentIds || '').split(',').map(Number).filter(Boolean);
  const all  = [...new Set([...cIds, ...eIds])];
  if (!all.length) return res.json([]);

  const { rows } = await pool.query(`
    SELECT
      e.id, e.name,
      et.name    AS type_name,
      et.name_ru AS type_label,
      e.properties->>'contract_type'      AS contract_type,
      e.properties->>'contractor_name'    AS contractor_name,
      e.properties->>'contract_amount'    AS contract_amount,
      e.properties->>'contract_date'      AS contract_date,
      e.properties->>'doc_status'         AS doc_status,
      e.properties->>'status'             AS equipment_status,
      e.properties->>'equipment_category' AS equipment_category,
      e.properties->>'equipment_kind'     AS equipment_kind
    FROM entities e
    JOIN entity_types et ON et.id = e.entity_type_id
    WHERE e.id = ANY($1) AND e.deleted_at IS NULL
    ORDER BY et.name, e.name
  `, [all]);

  res.json(rows);
}));

module.exports = router;
