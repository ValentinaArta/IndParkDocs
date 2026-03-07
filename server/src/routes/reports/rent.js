'use strict';
const express = require('express');
const pool = require('../../db');
const { authenticate } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');

const router = express.Router();

// GET /api/reports/rent-analysis — flat rows from Аренды/Субаренды contracts, from rent_items table
router.get('/rent-analysis', authenticate, asyncHandler(async (req, res) => {
  // For each signed Аренды/Субаренды contract:
  //   Find the latest supplement with rent_items (effective source).
  //   Fall back to the contract itself if no such supplement exists.
  //   Expand each rent_item row into a report row.
  const sql = `
    WITH contracts AS (
      SELECT
        e.id, e.name,
        e.properties->>'contract_type'      AS contract_type,
        e.properties->>'number'             AS contract_number,
        e.properties->>'contract_date'      AS contract_date,
        e.properties->>'contract_end_date'  AS contract_end_date,
        e.properties->>'our_legal_entity'   AS our_legal_entity,
        e.properties->>'vat_rate'           AS vat_rate,
        e.properties->>'external_rental'    AS external_rental,
        (e.properties->>'contractor_id')::int AS contractor_id,
        (e.properties->>'subtenant_id')::int  AS subtenant_id
      FROM entities e
      JOIN entity_types et ON et.id = e.entity_type_id AND et.name = 'contract'
      WHERE e.deleted_at IS NULL
        AND e.properties->>'contract_type' IN ('Аренды','Субаренды')
        AND (e.properties->>'doc_status' IN ('Подписан','')
             OR e.properties->>'doc_status' IS NULL)
    ),
    eff_supp AS (
      -- Latest supplement that has rent_items rows
      SELECT DISTINCT ON (s.parent_id)
        s.parent_id                          AS contract_id,
        s.id                                 AS supp_id,
        s.name                               AS supp_name,
        s.properties->>'contract_date'       AS supp_date,
        s.properties->>'contract_end_date'   AS supp_end_date
      FROM entities s
      JOIN entity_types st ON st.id = s.entity_type_id AND st.name = 'supplement'
      WHERE s.deleted_at IS NULL
        AND s.parent_id IN (SELECT id FROM contracts)
        AND EXISTS (SELECT 1 FROM rent_items ri WHERE ri.contract_id = s.id)
      ORDER BY s.parent_id,
               s.properties->>'contract_date' DESC NULLS LAST,
               s.id DESC
    )
    SELECT
      c.id, c.name,
      c.contract_type, c.contract_number, c.contract_date,
      COALESCE(es.supp_end_date, c.contract_end_date) AS contract_end_date,
      c.our_legal_entity, c.vat_rate, c.external_rental,
      contr.name  AS contractor_name,
      subt.name   AS subtenant_name,
      -- effective source
      COALESCE(es.supp_id, c.id)   AS src_id,
      (es.supp_id IS NOT NULL)      AS from_supplement,
      es.supp_name,
      es.supp_date,
      -- rent_items columns (NULL when contract has no rent_items)
      ri.id           AS ri_id,
      ri.object_type,
      ri.comment,
      ri.utility_rate,
      ri.calc_mode,
      COALESCE(ri.rent_rate, 0)     AS rent_rate,
      COALESCE(ri.net_rate, 0)      AS net_rate,
      COALESCE(ri.area,
        CAST(ent.properties->>'area' AS numeric),
        0)                           AS area,
      ent.name                       AS entity_name,
      ent.properties->>'object_type' AS room_object_type,
      -- building name: parent of room entity
      CASE WHEN ri.object_type = 'room' THEN bld.name ELSE NULL END AS building_name
    FROM contracts c
    LEFT JOIN eff_supp es      ON es.contract_id = c.id
    LEFT JOIN rent_items ri    ON ri.contract_id = COALESCE(es.supp_id, c.id)
    LEFT JOIN entities ent     ON ent.id = ri.entity_id AND ent.deleted_at IS NULL
    LEFT JOIN entities bld     ON bld.id = ent.parent_id AND bld.deleted_at IS NULL
    LEFT JOIN entities contr   ON contr.id = c.contractor_id AND contr.deleted_at IS NULL
    LEFT JOIN entities subt    ON subt.id  = c.subtenant_id  AND subt.deleted_at IS NULL
    ORDER BY c.contract_date NULLS LAST, c.name, ri.sort_order NULLS LAST`;

  const result = await pool.query(sql);
  const rows = [];
  let seq = 0;
  const fromSupp = v => v === true || v === 't';

  result.rows.forEach(c => {
    seq++;
    const area = parseFloat(c.area) || 0;
    const rate = parseFloat(c.rent_rate) || 0;
    const objType = c.room_object_type ||
      (c.object_type === 'land_plot'      ? 'Земельный участок' :
       c.object_type === 'land_plot_part' ? 'Часть ЗУ'          : '') || '';
    rows.push({
      seq,
      contract_id: c.id,           contract_name: c.name,
      contract_type: c.contract_type     || '',
      contract_number: c.contract_number || '',
      contract_date: c.contract_date     || '',
      contract_end_date: c.contract_end_date || '',
      our_legal_entity: c.our_legal_entity   || '',
      contractor_name: c.contractor_name     || '',
      subtenant_name: c.subtenant_name       || '',
      vat_rate: parseFloat(c.vat_rate) || 0,
      object_type: objType,
      building: c.building_name || '',
      room: c.entity_name       || '',
      area, rent_rate: rate,
      annual_amount:  area * rate * 12,
      monthly_amount: area * rate,
      net_rate: parseFloat(c.net_rate) || 0,
      utility_rate: c.utility_rate || '',
      comment: c.comment || '',
      external_rental: c.external_rental === 'true' || c.external_rental === true,
      from_supplement: fromSupp(c.from_supplement),
      supp_name: fromSupp(c.from_supplement) ? (c.supp_name || '') : '',
      supp_date: fromSupp(c.from_supplement) ? (c.supp_date || '') : '',
    });
  });

  const limit  = Math.min(Math.max(parseInt(req.query.limit)  || 0, 0), 10000);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  if (limit > 0) {
    res.json({ total: rows.length, rows: rows.slice(offset, offset + limit) });
  } else {
    res.json(rows);
  }
}));

// GET /api/reports/area-stats — total vs rented area per building / land_plot
router.get('/area-stats', authenticate, asyncHandler(async (req, res) => {
  // Buildings with room totals
  const buildingRes = await pool.query(`
    SELECT b.id, b.name, b.properties->>'short_name' AS short_name,
           COALESCE(SUM(CAST(r.properties->>'area' AS numeric)), 0) AS total_area
    FROM entities b
    JOIN entity_types bt ON b.entity_type_id = bt.id AND bt.name = 'building'
    LEFT JOIN entities r   ON r.parent_id = b.id AND r.deleted_at IS NULL
      AND EXISTS (SELECT 1 FROM entity_types rt WHERE rt.id = r.entity_type_id AND rt.name = 'room')
    WHERE b.deleted_at IS NULL
    GROUP BY b.id, b.name, b.properties->>'short_name'
    ORDER BY b.name`);

  // For each signed Аренды/Субаренды contract, find effective rent_items source
  const rentContracts = await pool.query(`
    SELECT e.id,
           (e.properties->>'contractor_id')::int AS contractor_id
    FROM entities e
    JOIN entity_types et ON et.id = e.entity_type_id AND et.name = 'contract'
    WHERE e.deleted_at IS NULL
      AND e.properties->>'contract_type' IN ('Аренды','Субаренды')
      AND (e.properties->>'doc_status' IN ('Подписан','') OR e.properties->>'doc_status' IS NULL)`);

  // Effective source for each contract (latest supplement with rent_items, else contract itself)
  const effSuppRes = await pool.query(`
    SELECT DISTINCT ON (s.parent_id)
      s.parent_id AS contract_id, s.id AS supp_id
    FROM entities s
    JOIN entity_types st ON st.id = s.entity_type_id AND st.name = 'supplement'
    WHERE s.deleted_at IS NULL
      AND s.parent_id = ANY($1)
      AND EXISTS (SELECT 1 FROM rent_items ri WHERE ri.contract_id = s.id)
    ORDER BY s.parent_id, s.properties->>'contract_date' DESC NULLS LAST, s.id DESC`,
    [rentContracts.rows.map(r => r.id)]);
  const effSuppMap = {};
  effSuppRes.rows.forEach(r => { effSuppMap[r.contract_id] = r.supp_id; });

  // Get all rent_items for effective sources (rooms only → buildings)
  const srcIds = rentContracts.rows.map(c => effSuppMap[c.id] || c.id);
  const contractBySrc = {};
  rentContracts.rows.forEach(c => { contractBySrc[effSuppMap[c.id] || c.id] = c.id; });

  const rentItemsRes = await pool.query(`
    SELECT ri.contract_id AS src_id,
           ri.object_type,
           ri.entity_id,
           COALESCE(ri.area, CAST(ent.properties->>'area' AS numeric), 0) AS area,
           bld.name AS building_name,
           lp.name  AS lp_name
    FROM rent_items ri
    LEFT JOIN entities ent ON ent.id = ri.entity_id AND ent.deleted_at IS NULL
    LEFT JOIN entities bld ON bld.id = ent.parent_id AND bld.deleted_at IS NULL
                          AND ri.object_type = 'room'
    LEFT JOIN entities lp  ON lp.id  = ri.entity_id AND lp.deleted_at IS NULL
                          AND ri.object_type IN ('land_plot','land_plot_part')
    WHERE ri.contract_id = ANY($1)`, [srcIds.length ? srcIds : [0]]);

  // contractor names
  const contractorIds = [...new Set(rentContracts.rows.map(r => r.contractor_id).filter(Boolean))];
  const contractorNames = {};
  if (contractorIds.length) {
    const cnRes = await pool.query(`SELECT id, name FROM entities WHERE id = ANY($1)`, [contractorIds]);
    cnRes.rows.forEach(r => { contractorNames[r.id] = r.name; });
  }

  // Aggregate rented area by building
  const rentedByBuilding = {};    // buildingName → area
  const contractsByBuilding = {}; // buildingName → { contractId → { area } }
  const lpRentedByName = {};
  const lpContractsByName = {};

  rentItemsRes.rows.forEach(ri => {
    const contractId = contractBySrc[ri.src_id];
    const area = parseFloat(ri.area) || 0;
    if (!area) return;

    if (ri.object_type === 'room' && ri.building_name) {
      const bn = ri.building_name;
      rentedByBuilding[bn] = (rentedByBuilding[bn] || 0) + area;
      if (!contractsByBuilding[bn]) contractsByBuilding[bn] = {};
      if (!contractsByBuilding[bn][contractId]) contractsByBuilding[bn][contractId] = { area: 0 };
      contractsByBuilding[bn][contractId].area += area;
    } else if ((ri.object_type === 'land_plot' || ri.object_type === 'land_plot_part') && ri.lp_name) {
      const lpn = ri.lp_name;
      lpRentedByName[lpn] = (lpRentedByName[lpn] || 0) + area;
      if (!lpContractsByName[lpn]) lpContractsByName[lpn] = {};
      if (!lpContractsByName[lpn][contractId]) lpContractsByName[lpn][contractId] = { area: 0 };
      lpContractsByName[lpn][contractId].area += area;
    }
  });

  // Contract name lookup
  const allContractIds = new Set();
  Object.values(contractsByBuilding).forEach(m => Object.keys(m).forEach(id => allContractIds.add(parseInt(id))));
  Object.values(lpContractsByName).forEach(m => Object.keys(m).forEach(id => allContractIds.add(parseInt(id))));
  const contractMeta = {};
  if (allContractIds.size > 0) {
    const cmRes = await pool.query(
      `SELECT e.id, e.name, (e.properties->>'contractor_id')::int AS cid FROM entities e WHERE e.id = ANY($1)`,
      [Array.from(allContractIds)]);
    cmRes.rows.forEach(r => { contractMeta[r.id] = { name: r.name, tenant: contractorNames[r.cid] || '' }; });
  }

  const buildings = buildingRes.rows.map(b => {
    const rented = rentedByBuilding[b.name] || rentedByBuilding[b.short_name] || 0;
    const cMap = contractsByBuilding[b.name] || contractsByBuilding[b.short_name] || {};
    const contracts = Object.entries(cMap).map(([cid, v]) => ({
      contract_id: parseInt(cid),
      contract_name: (contractMeta[cid] || {}).name || 'Договор #' + cid,
      tenant: (contractMeta[cid] || {}).tenant || '',
      area: v.area,
    })).sort((a, b) => b.area - a.area);
    return { id: b.id, name: b.name, short_name: b.short_name || '',
      total_area: parseFloat(b.total_area) || 0, rented_area: rented, contracts };
  });

  const grandTotal  = buildings.reduce((s, b) => s + b.total_area, 0);
  const grandRented = buildings.reduce((s, b) => s + b.rented_area, 0);

  const tenantMap = {};
  buildings.forEach(b => {
    (b.contracts || []).forEach(c => {
      const t = c.tenant || 'Без арендатора';
      if (!tenantMap[t]) tenantMap[t] = { tenant: t, area: 0, contracts: [] };
      tenantMap[t].area += c.area;
      tenantMap[t].contracts.push({ contract_id: c.contract_id, contract_name: c.contract_name, area: c.area, building: b.name });
    });
  });
  const tenants = Object.values(tenantMap).sort((a, b) => b.area - a.area);

  // Land plots
  const lpRes = await pool.query(`
    SELECT e.id, e.name, e.properties->>'short_name' AS short_name,
           COALESCE(NULLIF(e.properties->>'area',''), '0') AS area
    FROM entities e JOIN entity_types et ON e.entity_type_id = et.id AND et.name = 'land_plot'
    WHERE e.deleted_at IS NULL ORDER BY e.name`);

  const landPlots = lpRes.rows.map(lp => {
    const rented = lpRentedByName[lp.name] || lpRentedByName[lp.short_name] || 0;
    const cMap = lpContractsByName[lp.name] || lpContractsByName[lp.short_name] || {};
    const contracts = Object.entries(cMap).map(([cid, v]) => ({
      contract_id: parseInt(cid),
      contract_name: (contractMeta[cid] || {}).name || 'Договор #' + cid,
      tenant: (contractMeta[cid] || {}).tenant || '',
      area: v.area,
    })).sort((a, b) => b.area - a.area);
    return { id: lp.id, name: lp.name, short_name: lp.short_name || '',
      total_area: parseFloat(lp.area) || 0, rented_area: rented, contracts };
  });

  const lpTotal  = landPlots.reduce((s, lp) => s + lp.total_area, 0);
  const lpRented = landPlots.reduce((s, lp) => s + lp.rented_area, 0);

  const lpTenantMap = {};
  landPlots.forEach(lp => {
    (lp.contracts || []).forEach(c => {
      const t = c.tenant || 'Без арендатора';
      if (!lpTenantMap[t]) lpTenantMap[t] = { tenant: t, area: 0 };
      lpTenantMap[t].area += c.area;
    });
  });
  const lpTenants = Object.values(lpTenantMap).sort((a, b) => b.area - a.area);

  res.json({
    buildings, grand_total: grandTotal, grand_rented: grandRented, tenants,
    land_plots: landPlots, lp_total: lpTotal, lp_rented: lpRented, lp_tenants: lpTenants,
  });
}));

module.exports = router;
