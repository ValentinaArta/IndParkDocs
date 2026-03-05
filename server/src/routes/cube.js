const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { authenticate } = require('../middleware/auth');

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ── Dimension registry ──────────────────────────────────────────────────────
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
  // Act (работы) dimensions
  act_period_month:   { group: 'act',        col: 'act_period_month' },
  act_period_year:    { group: 'act',        col: 'act_period_year' },
  act_building:       { group: 'act',        col: 'act_building_name' },
  act_eq_category:    { group: 'act',        col: 'act_eq_category' },
  act_eq_name:        { group: 'act',        col: 'act_eq_name' },
  act_doc_status:     { group: 'act',        col: 'act_doc_status' },
};

// ── Contract-primary fact ───────────────────────────────────────────────────
const CONTRACT_FACT_BASE = `
WITH cbase AS (
  SELECT e.id AS contract_id, e.name AS contract_name, e.properties AS p
  FROM entities e
  JOIN entity_types et ON et.id = e.entity_type_id AND et.name = 'contract'
  WHERE e.deleted_at IS NULL
),
cbld AS (
  SELECT DISTINCT ON (r.from_entity_id)
    r.from_entity_id AS contract_id, b.name AS building_name
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
LEFT JOIN cbld bld ON bld.contract_id = cb.contract_id`;

// ── Equipment-primary fact ──────────────────────────────────────────────────
const EQUIPMENT_FACT_BASE = `
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
  SELECT equipment_id, contract_id FROM eq_via_transfer WHERE equipment_id IS NOT NULL
),
eq_bld AS (
  SELECT DISTINCT ON (equipment_id) equipment_id, building_name FROM (
    -- основной источник: корпус через parent_id
    SELECT eq.id AS equipment_id, b.name AS building_name, 1 AS prio
    FROM entities eq
    JOIN entity_types eqt ON eqt.id = eq.entity_type_id AND eqt.name = 'equipment'
    JOIN entities b ON b.id = eq.parent_id AND b.deleted_at IS NULL
    JOIN entity_types bet ON bet.id = b.entity_type_id AND bet.name IN ('building','workshop')
    WHERE eq.deleted_at IS NULL
    UNION ALL
    -- резервный источник: корпус через relation located_in
    SELECT r.from_entity_id AS equipment_id, b.name AS building_name, 2 AS prio
    FROM relations r
    JOIN entities b ON b.id = r.to_entity_id AND b.deleted_at IS NULL
    JOIN entity_types et ON et.id = b.entity_type_id AND et.name IN ('building','workshop')
    WHERE r.relation_type = 'located_in'
  ) _src
  ORDER BY equipment_id, prio
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
LEFT JOIN eq_bld eqb        ON eqb.equipment_id = eq.equipment_id`;

// ── Act-primary fact ────────────────────────────────────────────────────────
const ACT_FACT_BASE = `
WITH act_base AS (
  SELECT
    e.id        AS act_id,
    e.name      AS act_name,
    e.parent_id AS contract_id,
    e.properties->>'act_date'    AS act_date,
    e.properties->>'doc_status'  AS act_doc_status,
    e.properties->>'act_items'   AS act_items_raw
  FROM entities e
  JOIN entity_types et ON et.id = e.entity_type_id AND et.name = 'act'
  WHERE e.deleted_at IS NULL
),
act_flat AS (
  SELECT
    a.act_id, a.act_name, a.contract_id, a.act_doc_status,
    CASE WHEN a.act_date ~ '^[0-9]{4}-[0-9]{2}' THEN LEFT(a.act_date, 7) END AS act_period_month,
    CASE WHEN a.act_date ~ '^[0-9]{4}'           THEN LEFT(a.act_date, 4) END AS act_period_year,
    (item->>'equipment_id')::int                  AS equipment_id,
    item->>'equipment_name'                       AS act_eq_name_raw,
    item->>'description'                          AS item_description,
    COALESCE(NULLIF(item->>'amount',''), '0')::numeric AS item_amount
  FROM act_base a
  LEFT JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN a.act_items_raw IS NOT NULL
       AND a.act_items_raw NOT IN ('', 'null')
       AND a.act_items_raw ~ '^\\s*\\['
      THEN a.act_items_raw::jsonb
      ELSE '[]'::jsonb
    END
  ) AS item ON true
  WHERE (item->>'equipment_id') IS NOT NULL AND (item->>'equipment_id') <> ''
),
eq_info AS (
  SELECT
    eq.id                                  AS equipment_id,
    eq.name                                AS eq_name,
    eq.properties->>'equipment_category'   AS eq_category,
    b.name                                 AS building_name
  FROM entities eq
  JOIN entity_types eqt ON eqt.id = eq.entity_type_id AND eqt.name = 'equipment'
  LEFT JOIN entities b ON b.id = eq.parent_id AND b.deleted_at IS NULL
  LEFT JOIN entity_types bet ON bet.id = b.entity_type_id AND bet.name IN ('building','workshop')
  WHERE eq.deleted_at IS NULL
)
SELECT
  af.act_id,
  af.act_name,
  af.contract_id,
  af.act_doc_status,
  af.act_period_month,
  af.act_period_year,
  af.equipment_id,
  af.item_amount,
  af.item_description,
  COALESCE(ei.eq_name,      af.act_eq_name_raw) AS act_eq_name,
  COALESCE(ei.eq_category,  '')                 AS act_eq_category,
  COALESCE(ei.building_name,'')                 AS act_building_name
FROM act_flat af
LEFT JOIN eq_info ei ON ei.equipment_id = af.equipment_id`;

// ── Build WHERE from filters ────────────────────────────────────────────────
// mode: 'contract' | 'equipment' | 'act'
// Returns { clause: ' WHERE ...', params: [] }
function buildWhere(filters, mode) {
  if (!filters || typeof filters !== 'object') return { clause: '', params: [] };
  const isEq  = mode === 'equipment';
  const isAct = mode === 'act';

  const conds  = [];
  const params = [];
  let   p      = 1;

  if (!isAct) {
    // contract_type filter (contract & equipment facts)
    const ct = filters.contract_type;
    if (Array.isArray(ct) && ct.length) {
      const col = isEq ? 'cm.contract_type' : "cb.p->>'contract_type'";
      conds.push(`${col} = ANY($${p})`);
      params.push(ct);
      p++;
    }
    // doc_status filter
    const ds = filters.doc_status;
    if (Array.isArray(ds) && ds.length) {
      const col = isEq ? 'cm.doc_status' : "cb.p->>'doc_status'";
      conds.push(`${col} = ANY($${p})`);
      params.push(ds);
      p++;
    }
  } else {
    // act doc_status filter
    const ds = filters.doc_status;
    if (Array.isArray(ds) && ds.length) {
      conds.push(`af.act_doc_status = ANY($${p})`);
      params.push(ds);
      p++;
    }
  }

  return {
    clause: conds.length ? '\nWHERE ' + conds.join(' AND ') : '',
    params,
  };
}

// ── Pivot builder ───────────────────────────────────────────────────────────
// rowCols / colCols — arrays of DB column names (support multi-dim hierarchy)
// mode: 'contract' | 'equipment' | 'act'
function buildPivot(rows, rowCols, colCols, mode, hideEmpty) {
  const isEqPrimary  = mode === 'equipment';
  const isActPrimary = mode === 'act';
  const EM      = '\u2014'; // em-dash for null values
  const SEP     = '\u2192'; // separator for composite keys
  const rowKeys = new Map(); // key -> parts[]
  const colKeys = new Map(); // key -> parts[]
  const cells   = {};

  for (const row of rows) {
    const rParts = rowCols.map(c => (row[c] != null && row[c] !== '') ? String(row[c]) : EM);
    const cParts = colCols.map(c => (row[c] != null && row[c] !== '') ? String(row[c]) : EM);
    const rKey   = rParts.join(SEP);
    const cKey   = cParts.join(SEP);

    if (!rowKeys.has(rKey)) rowKeys.set(rKey, rParts);
    if (!colKeys.has(cKey)) colKeys.set(cKey, cParts);

    if (!cells[rKey])       cells[rKey] = {};
    if (!cells[rKey][cKey]) cells[rKey][cKey] = {
      contractIds:  new Set(),
      equipmentIds: new Set(),
      names:        new Set(),
      actItemCount: 0,
      actItemSum:   0,
    };

    const c = cells[rKey][cKey];
    if (isActPrimary) {
      c.actItemCount++;
      c.actItemSum += parseFloat(row.item_amount) || 0;
      // names = short descriptions for "Список" mode
      const desc = row.item_description || row.act_eq_name;
      if (desc) c.names.add(desc.length > 60 ? desc.substring(0, 58) + '\u2026' : desc);
      if (row.equipment_id) c.equipmentIds.add(row.equipment_id);
      if (row.act_id) c.contractIds.add(row.act_id); // reuse slot for drill-down
    } else {
      if (row.contract_id)  c.contractIds.add(row.contract_id);
      if (row.equipment_id) c.equipmentIds.add(row.equipment_id);
      if (isEqPrimary && row.equipment_name)   c.names.add(row.equipment_name);
      else if (!isEqPrimary && row.contractor_name) c.names.add(row.contractor_name);
    }
  }

  // Unique contract amounts to avoid double-counting (contracts & equipment facts)
  const amounts = {};
  if (!isActPrimary) {
    for (const row of rows) {
      if (row.contract_id && row.contract_amount > 0)
        amounts[row.contract_id] = parseFloat(row.contract_amount) || 0;
    }
  }

  const serial = {};
  for (const [rKey, rCells] of Object.entries(cells)) {
    serial[rKey] = {};
    for (const [cKey, c] of Object.entries(rCells)) {
      const contractIds  = [...c.contractIds];
      const equipmentIds = [...c.equipmentIds];
      let sum = 0;
      if (isActPrimary) {
        sum = c.actItemSum;
      } else {
        for (const cid of contractIds) sum += amounts[cid] || 0;
      }
      serial[rKey][cKey] = {
        count: isActPrimary ? c.actItemCount
             : isEqPrimary  ? (equipmentIds.length || contractIds.length)
             : contractIds.length,
        sum:   Math.round(sum),
        names: [...c.names].slice(0, 8),
        contractIds,
        equipmentIds,
      };
    }
  }

  // Sort by composite parts lexicographically
  const sortByParts = (partsA, partsB) => {
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const a = partsA[i] ?? '', b = partsB[i] ?? '';
      if (a === EM && b !== EM) return 1;
      if (b === EM && a !== EM) return -1;
      if (/^\d{4}/.test(a) && /^\d{4}/.test(b)) { if (a < b) return -1; if (a > b) return 1; }
      else { const cmp = String(a).localeCompare(String(b), 'ru'); if (cmp !== 0) return cmp; }
    }
    return 0;
  };
  const sortKeys = (keysMap) => [...keysMap.entries()].sort((x, y) => sortByParts(x[1], y[1])).map(e => e[0]);

  let rKeys = sortKeys(rowKeys);
  let cKeys = sortKeys(colKeys);

  // Hide empty rows / cols if requested
  if (hideEmpty) {
    cKeys = cKeys.filter(ck => rKeys.some(rk => serial[rk] && serial[rk][ck] && serial[rk][ck].count > 0));
    rKeys = rKeys.filter(rk => cKeys.some(ck => serial[rk] && serial[rk][ck] && serial[rk][ck].count > 0));
  }

  return {
    rows:  rKeys.map(k => ({ key: k, parts: rowKeys.get(k) })),
    cols:  cKeys.map(k => ({ key: k, parts: colKeys.get(k) })),
    cells: serial,
  };
}

// ── POST /api/cube/query ────────────────────────────────────────────────────
router.post('/query', authenticate, asyncHandler(async (req, res) => {
  // Accept both new multi-dim arrays (rowDims/colDims) and legacy singles (rowDim/colDim)
  const body = req.body;
  const rowDims = Array.isArray(body.rowDims) ? body.rowDims : (body.rowDim ? [body.rowDim] : []);
  const colDims = Array.isArray(body.colDims) ? body.colDims : (body.colDim ? [body.colDim] : []);
  const { filters = {}, hideEmpty = false } = body;

  if (!rowDims.length || !colDims.length)
    return res.status(400).json({ error: 'rowDims and colDims required' });

  for (const d of [...rowDims, ...colDims]) {
    if (!DIM_META[d]) return res.status(400).json({ error: 'Unknown dimension: ' + d });
  }

  const allMeta = [...rowDims, ...colDims].map(d => DIM_META[d]);
  const isAct = allMeta.some(m => m.group === 'act');
  const isEq  = !isAct && allMeta.some(m => m.group === 'equipment');
  const mode  = isAct ? 'act' : isEq ? 'equipment' : 'contract';
  const base  = isAct ? ACT_FACT_BASE : isEq ? EQUIPMENT_FACT_BASE : CONTRACT_FACT_BASE;

  const { clause, params } = buildWhere(filters, mode);
  const sql = base + clause;

  const { rows } = await pool.query(sql, params);
  const rowCols = rowDims.map(d => DIM_META[d].col);
  const colCols = colDims.map(d => DIM_META[d].col);
  const pivot   = buildPivot(rows, rowCols, colCols, mode, hideEmpty);

  res.json({ ...pivot, rowDims, colDims, factRows: rows.length });
}));

// ── GET /api/cube/filter-values ─────────────────────────────────────────────
// Returns available values for each filter field
router.get('/filter-values', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      ARRAY_AGG(DISTINCT e.properties->>'contract_type' ORDER BY e.properties->>'contract_type')
        FILTER (WHERE e.properties->>'contract_type' IS NOT NULL AND e.properties->>'contract_type' <> '') AS contract_types,
      ARRAY_AGG(DISTINCT e.properties->>'doc_status' ORDER BY e.properties->>'doc_status')
        FILTER (WHERE e.properties->>'doc_status' IS NOT NULL AND e.properties->>'doc_status' <> '') AS doc_statuses
    FROM entities e
    JOIN entity_types et ON et.id = e.entity_type_id AND et.name = 'contract'
    WHERE e.deleted_at IS NULL
  `);
  res.json(rows[0] || { contract_types: [], doc_statuses: [] });
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

// ── GET /api/cube/act-drilldown ─────────────────────────────────────────────
// Returns work items from acts, optionally filtered by equipment IDs
router.get('/act-drilldown', authenticate, asyncHandler(async (req, res) => {
  const actIds = (req.query.actIds       || '').split(',').map(Number).filter(Boolean);
  const eqIds  = (req.query.equipmentIds || '').split(',').map(Number).filter(Boolean);
  if (!actIds.length) return res.json([]);

  const params = [actIds];
  let eqFilter = '';
  if (eqIds.length) {
    params.push(eqIds);
    eqFilter = `AND (item->>'equipment_id')::int = ANY($2)`;
  }

  const { rows } = await pool.query(`
    SELECT
      e.id                                  AS act_id,
      e.name                                AS act_name,
      e.properties->>'act_date'             AS act_date,
      e.properties->>'act_number'           AS act_number,
      e.properties->>'doc_status'           AS doc_status,
      p.id                                  AS contract_id,
      p.name                                AS contract_name,
      (item->>'equipment_id')::int          AS equipment_id,
      item->>'equipment_name'               AS equipment_name,
      item->>'description'                  AS description,
      COALESCE(NULLIF(item->>'amount',''),'0')::numeric AS item_amount,
      (item->>'broken')::boolean            AS broken
    FROM entities e
    JOIN entity_types et ON et.id = e.entity_type_id AND et.name = 'act'
    LEFT JOIN entities p ON p.id = e.parent_id AND p.deleted_at IS NULL
    JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN e.properties->>'act_items' IS NOT NULL
         AND e.properties->>'act_items' NOT IN ('', 'null')
         AND e.properties->>'act_items' ~ '^\\s*\\['
        THEN (e.properties->>'act_items')::jsonb
        ELSE '[]'::jsonb
      END
    ) AS item ON true
    WHERE e.id = ANY($1) ${eqFilter}
    ORDER BY COALESCE(NULLIF(e.properties->>'act_date',''),'0001-01-01') DESC, e.id DESC
  `, params);

  res.json(rows);
}));

module.exports = router;
