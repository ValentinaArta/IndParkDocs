'use strict';
const express = require('express');
const pool = require('../../db');
const { authenticate } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { resolveRoArea } = require('./helpers');

const router = express.Router();

// GET /api/reports/rent-analysis — flat rows from Аренды/Субаренды contracts, expanded from rent_objects
router.get('/rent-analysis', authenticate, asyncHandler(async (req, res) => {
  const sql = `
    WITH latest_supps AS (
      SELECT DISTINCT ON (s.parent_id)
        s.parent_id              AS contract_id,
        s.id                     AS supp_id,
        s.name                   AS supp_name,
        s.properties->>'contract_date'     AS supp_date,
        s.properties->>'rent_objects'      AS rent_objects,
        s.properties->>'contract_end_date' AS supp_end_date
      FROM entities s
      JOIN entity_types st ON s.entity_type_id = st.id AND st.name = 'supplement'
      WHERE s.deleted_at IS NULL
        AND s.properties->>'rent_objects' IS NOT NULL
        AND s.properties->>'rent_objects' NOT IN ('', '[]', 'null')
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements((s.properties->>'rent_objects')::jsonb) AS obj
          WHERE (obj->>'rent_rate' IS NOT NULL AND obj->>'rent_rate' NOT IN ('', '0', '0.0', '0.00'))
             OR (obj->>'area'      IS NOT NULL AND obj->>'area'      NOT IN ('', '0', '0.0', '0.00'))
        )
      ORDER BY s.parent_id,
               s.properties->>'contract_date' DESC NULLS LAST,
               s.id DESC
    )
    SELECT
      e.id, e.name,
      e.properties->>'contract_type'     AS contract_type,
      e.properties->>'number'            AS contract_number,
      e.properties->>'contract_date'     AS contract_date,
      COALESCE(ls.supp_end_date, e.properties->>'contract_end_date') AS contract_end_date,
      e.properties->>'our_legal_entity'  AS our_legal_entity,
      contractor.name                    AS contractor_name,
      subtenant.name                     AS subtenant_name,
      e.properties->>'vat_rate'          AS vat_rate,
      e.properties->>'external_rental'   AS external_rental,
      COALESCE(ls.rent_objects, e.properties->>'rent_objects') AS rent_objects,
      ls.supp_id   IS NOT NULL  AS from_supplement,
      ls.supp_name              AS supp_name,
      ls.supp_date              AS supp_date
    FROM entities e
    JOIN entity_types et ON e.entity_type_id = et.id AND et.name = 'contract'
    LEFT JOIN latest_supps ls ON ls.contract_id = e.id
    LEFT JOIN entities AS contractor ON contractor.id = (e.properties->>'contractor_id')::int
    LEFT JOIN entities AS subtenant ON subtenant.id = (e.properties->>'subtenant_id')::int
    WHERE e.deleted_at IS NULL
      AND e.properties->>'contract_type' IN ('Аренды','Субаренды')
      AND (e.properties->>'doc_status' = 'Подписан' OR (e.properties->>'doc_status') IS NULL OR e.properties->>'doc_status' = '')
    ORDER BY e.properties->>'contract_date', e.name`;

  const result = await pool.query(sql);

  const roomsRes = await pool.query(
    `SELECT e.id, e.properties FROM entities e
     JOIN entity_types et ON e.entity_type_id = et.id AND et.name = 'room'
     WHERE e.deleted_at IS NULL`);
  const roomPropsMap = {};
  roomsRes.rows.forEach(function(r) { roomPropsMap[r.id] = r.properties || {}; });

  const rows = [];
  let seq = 0;

  result.rows.forEach(function(c) {
    let roList = [];
    try { roList = JSON.parse(c.rent_objects || '[]'); } catch(e) {}
    if (!Array.isArray(roList) || roList.length === 0) {
      seq++;
      rows.push({
        seq, contract_id: c.id, contract_name: c.name,
        contract_type: c.contract_type || '', contract_number: c.contract_number || '',
        contract_date: c.contract_date || '', contract_end_date: c.contract_end_date || '',
        our_legal_entity: c.our_legal_entity || '', contractor_name: c.contractor_name || '',
        subtenant_name: c.subtenant_name || '', vat_rate: parseFloat(c.vat_rate) || 0,
        object_type: '', building: '',
        area: 0, rent_rate: 0, annual_amount: 0, monthly_amount: 0,
        external_rental: c.external_rental === 'true' || c.external_rental === true,
        net_rate: 0, utility_rate: '', comment: '', room: ''
      });
      return;
    }
    const fromSupp = c.from_supplement === true || c.from_supplement === 't';
    roList.forEach(function(ro) {
      seq++;
      const area = resolveRoArea(ro, roomPropsMap);
      const rate = parseFloat(ro.rent_rate) || 0;
      const monthly = area * rate;
      const annual = monthly * 12;
      rows.push({
        seq, contract_id: c.id, contract_name: c.name,
        contract_type: c.contract_type || '', contract_number: c.contract_number || '',
        contract_date: c.contract_date || '', contract_end_date: c.contract_end_date || '',
        our_legal_entity: c.our_legal_entity || '', contractor_name: c.contractor_name || '',
        subtenant_name: c.subtenant_name || '', vat_rate: parseFloat(c.vat_rate) || 0,
        object_type: (function() {
          var rId = parseInt(ro.room_id) || 0;
          var rType = (rId && roomPropsMap[rId]) ? (roomPropsMap[rId].object_type || '') : '';
          return rType || ro.object_type || (ro.item_type === 'room' ? 'Помещение' : ro.item_type === 'equipment' ? 'Оборудование' : ro.item_type === 'land_plot' ? 'Земельный участок' : '') || '';
        })(), building: ro.building || '',
        rent_scope: ro.rent_scope || '',
        area, rent_rate: rate, annual_amount: annual, monthly_amount: monthly,
        net_rate: parseFloat(ro.net_rate) || 0,
        utility_rate: ro.utility_rate || '',
        external_rental: c.external_rental === 'true' || c.external_rental === true || ro.external_rental === 'true' || ro.external_rental === true,
        comment: ro.comment || '', room: ro.room || '',
        from_supplement: fromSupp,
        supp_name: fromSupp ? (c.supp_name || '') : '',
        supp_date: fromSupp ? (c.supp_date || '') : '',
      });
    });
  });

  const limit = Math.min(Math.max(parseInt(req.query.limit) || 0, 0), 10000);
  const offset = Math.max(parseInt(req.query.offset) || 0, 0);
  if (limit > 0) {
    res.json({ total: rows.length, rows: rows.slice(offset, offset + limit) });
  } else {
    res.json(rows);
  }
}));

// GET /api/reports/area-stats — total vs rented area per building
router.get('/area-stats', authenticate, asyncHandler(async (req, res) => {
  const buildingRes = await pool.query(`
    SELECT b.id, b.name, b.properties->>'short_name' AS short_name,
           COALESCE(SUM(CAST(r.properties->>'area' AS numeric)), 0) AS total_area
    FROM entities b
    JOIN entity_types bt ON b.entity_type_id = bt.id AND bt.name = 'building'
    LEFT JOIN entities r ON r.parent_id = b.id AND r.deleted_at IS NULL
      AND EXISTS (SELECT 1 FROM entity_types rt WHERE rt.id = r.entity_type_id AND rt.name = 'room')
    WHERE b.deleted_at IS NULL
    GROUP BY b.id, b.name, b.properties->>'short_name'
    ORDER BY b.name`);

  const allContracts = await pool.query(`
    SELECT e.id, e.parent_id, e.properties->>'rent_objects' AS rent_objects,
           e.properties->>'contract_date' AS contract_date,
           et.name AS type_name
    FROM entities e
    JOIN entity_types et ON e.entity_type_id = et.id
    WHERE e.deleted_at IS NULL
      AND et.name IN ('contract','supplement')
      AND (e.properties->>'contract_type' IN ('Аренды','Субаренды'))
      AND (
        (et.name = 'contract' AND (e.properties->>'doc_status' = 'Подписан' OR (e.properties->>'doc_status') IS NULL OR e.properties->>'doc_status' = ''))
        OR (et.name = 'supplement' AND e.parent_id IN (
          SELECT p.id FROM entities p
          JOIN entity_types pt ON pt.id = p.entity_type_id AND pt.name = 'contract'
          WHERE p.deleted_at IS NULL
            AND (p.properties->>'doc_status' = 'Подписан' OR (p.properties->>'doc_status') IS NULL OR p.properties->>'doc_status' = '')
        ))
      )
    ORDER BY e.properties->>'contract_date' NULLS FIRST, e.id`);

  const parentContracts = {};
  allContracts.rows.forEach(r => {
    if (r.type_name === 'contract') {
      if (!parentContracts[r.id]) parentContracts[r.id] = { own: r.rent_objects, latest: null };
    } else if (r.type_name === 'supplement' && r.parent_id) {
      if (!parentContracts[r.parent_id]) parentContracts[r.parent_id] = { own: null, latest: null };
      if (r.rent_objects && r.rent_objects !== '[]') parentContracts[r.parent_id].latest = r.rent_objects;
    }
  });

  const areaStatsRoomsRes = await pool.query(
    `SELECT e.id, e.properties FROM entities e
     JOIN entity_types et ON e.entity_type_id = et.id AND et.name = 'room'
     WHERE e.deleted_at IS NULL`);
  const roomPropsMapAS = {};
  areaStatsRoomsRes.rows.forEach(r => { roomPropsMapAS[r.id] = r.properties || {}; });

  const rentedByBuilding = {};
  const contractsByBuilding = {};
  Object.entries(parentContracts).forEach(([contractId, c]) => {
    let raw = c.latest || c.own;
    if (!raw) return;
    let objects = [];
    try { objects = JSON.parse(raw); } catch(e) { return; }
    if (!Array.isArray(objects)) return;
    objects.forEach(ro => {
      const area = resolveRoArea(ro, roomPropsMapAS);
      if (!area) return;
      const buildingName = ro.building || '';
      if (buildingName) {
        rentedByBuilding[buildingName] = (rentedByBuilding[buildingName] || 0) + area;
        if (!contractsByBuilding[buildingName]) contractsByBuilding[buildingName] = {};
        const key = contractId;
        if (!contractsByBuilding[buildingName][key]) contractsByBuilding[buildingName][key] = { area: 0 };
        contractsByBuilding[buildingName][key].area += area;
      }
    });
  });

  const allContractIds = new Set();
  Object.values(contractsByBuilding).forEach(map => Object.keys(map).forEach(id => allContractIds.add(parseInt(id))));
  const contractNames = {};
  if (allContractIds.size > 0) {
    const cnRes = await pool.query(`SELECT id, name, properties->>'contractor_name' AS tenant FROM entities WHERE id = ANY($1)`, [Array.from(allContractIds)]);
    cnRes.rows.forEach(r => { contractNames[r.id] = { name: r.name, tenant: r.tenant || '' }; });
  }

  const buildings = buildingRes.rows.map(b => {
    const rented = rentedByBuilding[b.name] || rentedByBuilding[b.short_name] || 0;
    const cMap = contractsByBuilding[b.name] || contractsByBuilding[b.short_name] || {};
    const contracts = Object.entries(cMap).map(([cid, v]) => ({
      contract_id: parseInt(cid),
      contract_name: (contractNames[cid] || {}).name || 'Договор #' + cid,
      tenant: (contractNames[cid] || {}).tenant || '',
      area: v.area,
    })).sort((a, b) => b.area - a.area);
    return {
      id: b.id, name: b.name, short_name: b.short_name || '',
      total_area: parseFloat(b.total_area) || 0, rented_area: rented,
      contracts: contracts,
    };
  });

  const grandTotal = buildings.reduce((s, b) => s + b.total_area, 0);
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

  const lpRentedByName = {};
  const lpContractsByName = {};
  Object.entries(parentContracts).forEach(([contractId, c]) => {
    let raw = c.latest || c.own;
    if (!raw) return;
    let objects = [];
    try { objects = JSON.parse(raw); } catch(e) { return; }
    if (!Array.isArray(objects)) return;
    objects.forEach(ro => {
      if (ro.object_type !== 'Земельный участок') return;
      const area = parseFloat(ro.area) || 0;
      if (!area) return;
      const lpName = ro.land_plot_name || ro.room || '';
      if (!lpName) return;
      lpRentedByName[lpName] = (lpRentedByName[lpName] || 0) + area;
      if (!lpContractsByName[lpName]) lpContractsByName[lpName] = {};
      if (!lpContractsByName[lpName][contractId]) lpContractsByName[lpName][contractId] = { area: 0 };
      lpContractsByName[lpName][contractId].area += area;
    });
  });

  const landPlots = lpRes.rows.map(lp => {
    const rented = lpRentedByName[lp.name] || lpRentedByName[lp.short_name] || 0;
    const cMap = lpContractsByName[lp.name] || lpContractsByName[lp.short_name] || {};
    const contracts = Object.entries(cMap).map(([cid, v]) => ({
      contract_id: parseInt(cid),
      contract_name: (contractNames[cid] || {}).name || 'Договор #' + cid,
      tenant: (contractNames[cid] || {}).tenant || '',
      area: v.area,
    })).sort((a, b) => b.area - a.area);
    return {
      id: lp.id, name: lp.name, short_name: lp.short_name || '',
      total_area: parseFloat(lp.area) || 0, rented_area: rented, contracts,
    };
  });

  const lpTotal = landPlots.reduce((s, lp) => s + lp.total_area, 0);
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
