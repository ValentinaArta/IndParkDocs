'use strict';
const express = require('express');
const pool = require('../../db');
const { authenticate } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { getContractDirection, isAllPartiesInternal } = require('../../utils/contractDirection');
const { _odataGetRpt, resolveRoArea, latestSuppValue } = require('./helpers');

const router = express.Router();

// GET /api/reports/contract-card/:id — full card for any contract type
router.get('/contract-card/:id', authenticate, asyncHandler(async (req, res) => {
  const contractId = parseInt(req.params.id);

  // 1. Load contract
  const cRes = await pool.query(
    `SELECT e.*, et.name as type_name FROM entities e
     JOIN entity_types et ON e.entity_type_id = et.id
     WHERE e.id = $1 AND e.deleted_at IS NULL`, [contractId]);
  if (!cRes.rows.length) return res.status(404).json({ error: 'Not found' });
  const contract = cRes.rows[0];
  const cProps = contract.properties || {};

  // 1b. Subject objects: rooms / buildings / land_plots via located_in relations
  const subjectObjRes = await pool.query(
    `SELECT e.id, e.name, et.name as type_name
     FROM relations r
     JOIN entities e ON e.id = r.to_entity_id AND e.deleted_at IS NULL
     JOIN entity_types et ON et.id = e.entity_type_id
     WHERE r.from_entity_id = $1 AND r.relation_type = 'located_in'
       AND et.name IN ('room', 'building', 'land_plot')
     ORDER BY et.name, e.name`, [contractId]);
  const subjectRooms    = subjectObjRes.rows.filter(r => r.type_name === 'room');
  const subjectBuildings = subjectObjRes.rows.filter(r => r.type_name === 'building');
  const subjectLandPlots = subjectObjRes.rows.filter(r => r.type_name === 'land_plot');

  // 1c. Own company IDs for ВГО detection
  const ownRes = await pool.query(
    `SELECT e.id FROM entities e JOIN entity_types et ON et.id = e.entity_type_id AND et.name = 'company'
     WHERE e.deleted_at IS NULL AND e.properties->>'is_own' = 'true'`);
  const ownIds = new Set(ownRes.rows.map(r => r.id));
  const isVgo = isAllPartiesInternal(cProps, ownIds);
  const direction = getContractDirection(cProps.our_role_label || '');

  // 2. All supplements sorted by date asc
  const sRes = await pool.query(
    `SELECT e.id, e.name, e.properties
     FROM entities e JOIN entity_types et ON e.entity_type_id = et.id AND et.name = 'supplement'
     WHERE e.parent_id = $1 AND e.deleted_at IS NULL
     ORDER BY e.properties->>'contract_date' ASC NULLS LAST, e.id ASC`, [contractId]);
  const supplements = sRes.rows;

  // 3. Latest supplement with rent_objects
  let rentObjects = [];
  let rentSourceName = '';
  for (let i = supplements.length - 1; i >= 0; i--) {
    const sp = supplements[i];
    const raw = (sp.properties || {}).rent_objects;
    if (raw && raw !== '[]' && raw !== 'null') {
      try {
        const ro = JSON.parse(raw);
        if (Array.isArray(ro) && ro.length > 0) { rentObjects = ro; rentSourceName = sp.name; break; }
      } catch(e) {}
    }
  }
  if (!rentObjects.length) {
    try { rentObjects = JSON.parse(cProps.rent_objects || '[]'); } catch(e) {}
  }

  // 4. Latest supplement with transfer_equipment
  let transferEquipment = [];
  let transferSourceName = '';
  for (let i = supplements.length - 1; i >= 0; i--) {
    const sp = supplements[i];
    const p = sp.properties || {};
    if (p.transfer_equipment === 'true' || p.transfer_equipment === true) {
      try {
        const eqList = JSON.parse(p.equipment_list || '[]');
        if (Array.isArray(eqList) && eqList.length > 0) {
          transferEquipment = eqList; transferSourceName = sp.name; break;
        }
      } catch(e) {}
    }
  }

  // 4b. Latest supplement with equipment_rent_items
  let equipmentRentItems = [];
  let equipmentRentSourceName = '';
  for (let i = supplements.length - 1; i >= 0; i--) {
    const sp = supplements[i];
    const raw = (sp.properties || {}).equipment_rent_items;
    if (raw && raw !== '[]' && raw !== 'null') {
      try {
        const items = JSON.parse(raw);
        if (Array.isArray(items) && items.length > 0) {
          equipmentRentItems = items; equipmentRentSourceName = sp.name; break;
        }
      } catch(e) {}
    }
  }
  if (!equipmentRentItems.length) {
    try { equipmentRentItems = JSON.parse(cProps.equipment_rent_items || '[]'); } catch(e) {}
  }

  // Enrich equipment_rent_items with DB data
  const rentEqIds = [...new Set(equipmentRentItems.map(i => parseInt(i.equipment_id)).filter(id => id > 0))];
  const rentEqMap = {};
  if (rentEqIds.length) {
    const reRes = await pool.query(
      'SELECT id, name, properties FROM entities WHERE id = ANY($1)', [rentEqIds]);
    reRes.rows.forEach(eq => { rentEqMap[eq.id] = { name: eq.name, props: eq.properties || {} }; });
  }
  const enrichedRentItems = equipmentRentItems.map(item => {
    const id = parseInt(item.equipment_id);
    const d = rentEqMap[id] || {};
    const p = d.props || {};
    return {
      equipment_id: id,
      name: d.name || item.equipment_name || item.name || '—',
      inv_number: p.inv_number || item.inv_number || '',
      category: p.equipment_category || '',
      qty: parseFloat(item.qty) || 1,
      rate: parseFloat(item.rent_cost || item.rate || item.rent_rate) || 0,
    };
  });
  const rentItemsMonthly = enrichedRentItems.reduce((s, i) => s + i.qty * i.rate, 0);

  // 5. Room descriptions
  const roomIds = [...new Set(rentObjects.map(ro => parseInt(ro.room_id)).filter(id => id > 0))];
  const roomMap = {};
  if (roomIds.length) {
    const rRes = await pool.query(
      'SELECT id, name, properties FROM entities WHERE id = ANY($1) AND deleted_at IS NULL', [roomIds]);
    rRes.rows.forEach(r => { roomMap[r.id] = { name: r.name, props: r.properties || {} }; });
  }
  const roomPropsMapCC = {};
  Object.entries(roomMap).forEach(([id, r]) => { roomPropsMapCC[id] = r.props; });

  // 6. Equipment details + located_in + broken-from-acts
  const eqIds = [...new Set(transferEquipment.map(eq => parseInt(eq.equipment_id)).filter(id => id > 0))];
  const eqMap = {};
  const brokenEqIds = new Set();
  if (eqIds.length) {
    const eRes = await pool.query(
      'SELECT id, name, properties FROM entities WHERE id = ANY($1)', [eqIds]);
    eRes.rows.forEach(eq => { eqMap[eq.id] = { name: eq.name, props: eq.properties || {}, location: '' }; });
    const locRes = await pool.query(
      `SELECT r.from_entity_id AS eq_id, t.name AS loc
       FROM relations r JOIN entities t ON t.id = r.to_entity_id AND t.deleted_at IS NULL
       WHERE r.from_entity_id = ANY($1) AND r.relation_type = 'located_in'
       ORDER BY r.id DESC`, [eqIds]);
    const locMap = {};
    locRes.rows.forEach(r => { if (!locMap[r.eq_id]) locMap[r.eq_id] = r.loc; });
    Object.keys(eqMap).forEach(id => { eqMap[id].location = locMap[parseInt(id)] || ''; });
    const brokenRes = await pool.query(
      `SELECT DISTINCT ON (r.from_entity_id) r.from_entity_id AS eq_id, a.properties->>'act_items' AS act_items
       FROM relations r
       JOIN entities a ON a.id = r.to_entity_id AND a.deleted_at IS NULL
       JOIN entity_types at ON a.entity_type_id = at.id AND at.name = 'act'
       WHERE r.from_entity_id = ANY($1) AND r.relation_type = 'subject_of'
       ORDER BY r.from_entity_id, (a.properties->>'act_date') DESC NULLS LAST, a.id DESC`, [eqIds]);
    brokenRes.rows.forEach(function(row) {
      let items = [];
      try { items = JSON.parse(row.act_items || '[]'); } catch(e) {}
      const item = items.find(i => parseInt(i.equipment_id) === row.eq_id);
      if (item && (item.broken === true || item.broken === 'true')) brokenEqIds.add(row.eq_id);
    });
  }

  // 7. Build rent rows
  const rentRows = rentObjects.map(ro => {
    const roomId = parseInt(ro.room_id) || 0;
    const rd = roomMap[roomId] || {};
    const area = resolveRoArea(ro, roomPropsMapCC);
    const rate = parseFloat(ro.rent_rate) || 0;
    const isLandPlot = (ro.object_type === 'ЗУ' || ro.object_type === 'Земельный участок');
    const displayName = isLandPlot
      ? (ro.land_plot_part_name || ro.land_plot_name || ro.room || rd.name || '')
      : (ro.room || rd.name || '');
    return {
      room_name: displayName,
      description: (rd.props || {}).description || '',
      area, rate, monthly: area * rate,
      object_type: ro.object_type || '',
    };
  });
  const totalMonthly = rentRows.reduce((s, r) => s + r.monthly, 0);

  // 8. Build equipment list
  const eqList = transferEquipment.map(eq => {
    const id = parseInt(eq.equipment_id);
    const d = eqMap[id] || {};
    const p = d.props || {};
    return {
      id,
      name: d.name || eq.equipment_name || '',
      inv_number: p.inv_number || eq.inv_number || '',
      category: p.equipment_category || '', kind: p.equipment_kind || '',
      location: d.location || '', status: p.status || '',
      is_emergency: p.status === 'Аварийное', is_broken: brokenEqIds.has(id),
    };
  });

  // 9. Acts for this contract
  const aRes = await pool.query(
    `SELECT e.id, e.name, e.properties
     FROM entities e JOIN entity_types et ON e.entity_type_id = et.id AND et.name = 'act'
     WHERE e.parent_id = $1 AND e.deleted_at IS NULL
     ORDER BY e.properties->>'act_date' ASC NULLS LAST, e.id ASC`, [contractId]);
  const actEqIds = new Set();
  const actItemsMap = {};
  aRes.rows.forEach(a => {
    try {
      const items = JSON.parse((a.properties || {}).act_items || '[]');
      actItemsMap[a.id] = items;
      items.forEach(i => { if (i.equipment_id) actEqIds.add(parseInt(i.equipment_id)); });
    } catch(e) { actItemsMap[a.id] = []; }
  });
  const actEqMap = {};
  if (actEqIds.size > 0) {
    const eqRes = await pool.query('SELECT id, name FROM entities WHERE id = ANY($1)', [[...actEqIds]]);
    eqRes.rows.forEach(eq => { actEqMap[eq.id] = eq.name; });
  }
  const acts = aRes.rows.map(a => {
    const p = a.properties || {};
    const items = actItemsMap[a.id] || [];
    const total = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const equipment = items.map(i => {
      const eqId = parseInt(i.equipment_id);
      return actEqMap[eqId] || i.equipment_name || '';
    }).filter(Boolean);
    return { id: a.id, name: a.name, number: p.act_number || p.number || '',
      date: p.act_date || p.contract_date || '', total, equipment, is_act: true };
  });

  // 10. Supplements history
  const histItems = [
    ...supplements.map(sp => {
      const p = sp.properties || {};
      return { id: sp.id, name: sp.name, number: p.number || '',
        date: p.contract_date || '', changes: p.changes_description || '',
        contractor_name: p.contractor_name || '', doc_status: p.doc_status || '',
        is_contract: false, is_act: false };
    }),
    ...acts,
  ].sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.id - b.id);

  const history = [
    { id: contract.id, name: contract.name, number: cProps.number || '',
      date: cProps.contract_date || '', changes: 'Основной договор', is_contract: true },
    ...histItems,
  ];

  // Parse contract_items for non-rental types
  let contractItems = [];
  try { contractItems = JSON.parse(cProps.contract_items || '[]'); } catch(e) {}

  // For non-rental: get equipment_list directly from contract/latest supplement
  let directEquipment = [];
  if (cProps.contract_type !== 'Аренды' && cProps.contract_type !== 'Субаренды') {
    let eqRaw = null;
    for (let i = supplements.length - 1; i >= 0; i--) {
      const sp = supplements[i];
      const raw = (sp.properties || {}).equipment_list;
      if (raw && raw !== '[]' && raw !== 'null') { eqRaw = raw; break; }
    }
    if (!eqRaw) eqRaw = cProps.equipment_list;
    try { directEquipment = JSON.parse(eqRaw || '[]'); } catch(e) {}
  }

  if (eqList.length === 0 && directEquipment.length > 0) {
    const deqIds = directEquipment.map(eq => parseInt(eq.equipment_id)).filter(id => id > 0);
    if (deqIds.length) {
      const deRes = await pool.query(
        'SELECT id, name, properties FROM entities WHERE id = ANY($1)', [deqIds]);
      const deMap = {};
      deRes.rows.forEach(eq => { deMap[eq.id] = { name: eq.name, props: eq.properties || {} }; });
      directEquipment.forEach(eq => {
        const id = parseInt(eq.equipment_id);
        const d = deMap[id] || {};
        const p = d.props || {};
        eqList.push({
          id,
          name: d.name || eq.equipment_name || '',
          inv_number: p.inv_number || eq.inv_number || '',
          category: p.equipment_category || '',
          kind: p.equipment_kind || '', location: '', status: p.status || '',
          is_emergency: p.status === 'Аварийное', is_broken: false,
        });
      });
    }
  }

  // Effective values: latest supplement overrides contract
  const effAmount      = latestSuppValue(supplements, 'contract_amount')    || cProps.contract_amount    || '';
  const effSubject     = latestSuppValue(supplements, 'subject')             || latestSuppValue(supplements, 'service_subject') || cProps.subject || cProps.service_subject || '';
  const effDurType     = latestSuppValue(supplements, 'duration_type')       || cProps.duration_type      || '';
  const effDurDate     = latestSuppValue(supplements, 'duration_date')       || latestSuppValue(supplements, 'contract_end_date') || cProps.duration_date || cProps.contract_end_date || '';
  const effDurText     = latestSuppValue(supplements, 'duration_text')       || cProps.duration_text      || '';
  const effPayFreq     = latestSuppValue(supplements, 'payment_frequency')   || cProps.payment_frequency  || '';
  const effVat         = latestSuppValue(supplements, 'vat_rate')            || cProps.vat_rate           || '';
  const effDeadline    = latestSuppValue(supplements, 'completion_deadline') || cProps.completion_deadline || '';
  const effComment     = latestSuppValue(supplements, 'service_comment')     || cProps.service_comment    || '';

  let effContractItems = contractItems;
  const suppCiRaw = latestSuppValue(supplements, 'contract_items');
  if (suppCiRaw) {
    try {
      const parsed = JSON.parse(suppCiRaw);
      if (Array.isArray(parsed) && parsed.length > 0) effContractItems = parsed;
    } catch(e) {}
  }

  let effSubjectBuildings = subjectBuildings;
  let effSubjectRooms     = subjectRooms;
  let effSubjectLandPlots = subjectLandPlots;
  const _parseSubjArr = raw => { try { const a = JSON.parse(raw); return Array.isArray(a) && a.length ? a : null; } catch(e) { return null; } };
  const suppSbRaw = latestSuppValue(supplements, 'subject_buildings');
  if (suppSbRaw) { const a = _parseSubjArr(suppSbRaw); if (a) effSubjectBuildings = a; }
  const suppSrRaw = latestSuppValue(supplements, 'subject_rooms');
  if (suppSrRaw) { const a = _parseSubjArr(suppSrRaw); if (a) effSubjectRooms = a; }
  const suppSlRaw = latestSuppValue(supplements, 'subject_land_plots');
  if (suppSlRaw) { const a = _parseSubjArr(suppSlRaw); if (a) effSubjectLandPlots = a; }

  const _companyIds = [parseInt(cProps.contractor_id), parseInt(cProps.subtenant_id), parseInt(cProps.our_legal_entity_id)].filter(Boolean);
  const _companyMap = {};
  if (_companyIds.length) {
    const _cRes = await pool.query('SELECT id, name FROM entities WHERE id = ANY($1)', [_companyIds]);
    _cRes.rows.forEach(r => { _companyMap[r.id] = r.name; });
  }

  res.json({
    id: contract.id, name: contract.name, contract_type: cProps.contract_type || '',
    doc_status: cProps.doc_status || '',
    number: cProps.number || '', date: cProps.contract_date || '',
    our_legal_entity: _companyMap[parseInt(cProps.our_legal_entity_id)] || cProps.our_legal_entity || '',
    our_role_label: cProps.our_role_label || '',
    contractor_name: _companyMap[parseInt(cProps.contractor_id)] || cProps.contractor_name || '',
    contractor_id: parseInt(cProps.contractor_id) || null,
    contractor_role_label: cProps.contractor_role_label || '',
    subtenant_name: _companyMap[parseInt(cProps.subtenant_id)] || cProps.subtenant_name || '',
    subtenant_id: parseInt(cProps.subtenant_id) || null,
    contract_end_date: effDurDate,
    duration_type: effDurType,
    duration_text: effDurText,
    contract_amount: effAmount,
    subject: effSubject,
    building: cProps.building || '',
    tenant: cProps.tenant || '',
    vat_rate: effVat,
    advances: latestSuppValue(supplements, 'advances') || cProps.advances || '',
    completion_deadline: effDeadline,
    service_comment: effComment,
    payment_frequency: effPayFreq,
    has_power_allocation: latestSuppValue(supplements, 'has_power_allocation') || cProps.has_power_allocation || '',
    power_allocation_kw: latestSuppValue(supplements, 'power_allocation_kw')  || cProps.power_allocation_kw  || '',
    contract_items: effContractItems,
    rent_source_name: rentSourceName,
    transfer_source_name: transferSourceName,
    rent_rows: rentRows, total_monthly: totalMonthly,
    equipment_list: eqList, history,
    direction, is_vgo: isVgo,
    subject_rooms: effSubjectRooms,
    subject_buildings: effSubjectBuildings,
    subject_land_plots: effSubjectLandPlots,
    equipment_rent_items: enrichedRentItems,
    equipment_rent_source_name: equipmentRentSourceName,
    equipment_rent_monthly: rentItemsMonthly,
  });
}));

// GET /api/reports/contract-card/:id/advance-status — check advances against 1С payments
router.get('/contract-card/:id/advance-status', authenticate, asyncHandler(async (req, res) => {
  const contractId = parseInt(req.params.id);

  const cRes = await pool.query(
    `SELECT e.properties FROM entities e WHERE e.id = $1 AND e.deleted_at IS NULL`,
    [contractId]);
  if (!cRes.rows.length) return res.status(404).json({ error: 'Not found' });
  const cProps = cRes.rows[0].properties || {};

  const sRes = await pool.query(
    `SELECT e.properties FROM entities e
     JOIN entity_types et ON e.entity_type_id = et.id AND et.name = 'supplement'
     WHERE e.parent_id = $1 AND e.deleted_at IS NULL
     ORDER BY e.properties->>'contract_date' ASC NULLS LAST, e.id ASC`,
    [contractId]);
  const supplements = sRes.rows;

  let advancesRaw = '';
  for (let i = supplements.length - 1; i >= 0; i--) {
    const v = (supplements[i].properties || {}).advances;
    if (v && v !== '' && v !== '[]') { advancesRaw = v; break; }
  }
  if (!advancesRaw) advancesRaw = cProps.advances || '';

  let advances = [];
  try { if (advancesRaw) advances = JSON.parse(advancesRaw); } catch (_) {}

  const checkedAt = new Date().toISOString();
  if (!advances.length) return res.json({ advances: [], checkedAt });

  const direction = getContractDirection(cProps.our_role_label || '');
  const odataDoc = direction === 'income'
    ? 'Document_ПоступлениеНаРасчетныйСчет'
    : 'Document_СписаниеСРасчетногоСчета';

  let contractorRefKey = null;
  const contractorId = parseInt(cProps.contractor_id) || 0;
  if (contractorId) {
    const compRes = await pool.query(
      `SELECT properties->>'odata_ref_key' AS ref_key
       FROM entities WHERE id = $1 AND deleted_at IS NULL`,
      [contractorId]);
    if (compRes.rows.length && compRes.rows[0].ref_key) {
      contractorRefKey = compRes.rows[0].ref_key;
    }
  }

  const results = [];
  for (let idx = 0; idx < advances.length; idx++) {
    const adv = advances[idx];
    const amount = parseFloat(adv.amount) || 0;
    const advDate = adv.date ? new Date(adv.date) : null;

    let paid = false;
    let matchDoc = null;

    if (amount > 0 && advDate) {
      const dtFrom = new Date(advDate); dtFrom.setDate(dtFrom.getDate() - 7);
      const dtTo   = new Date(advDate); dtTo.setDate(dtTo.getDate() + 30);
      const fmt = d => d.toISOString().slice(0, 10) + 'T00:00:00';
      const filterParts = [
        'Posted eq true',
        'СуммаДокумента eq ' + amount,
        "Date ge datetime'" + fmt(dtFrom) + "'",
        "Date le datetime'" + fmt(dtTo) + "'"
      ];
      if (contractorRefKey) {
        filterParts.push("Контрагент eq guid'" + contractorRefKey + "'");
      }
      const path = odataDoc + '?$format=json&$filter=' +
        encodeURIComponent(filterParts.join(' and ')) +
        '&$select=Date,Number,СуммаДокумента,Контрагент,НазначениеПлатежа,Posted&$top=20';
      const data = await _odataGetRpt(path);
      const contractNumber = (cProps.number || '').trim();
      const candidates = (data.value || []).filter(d => d.Posted !== false);
      let found;
      if (contractNumber && candidates.length > 0) {
        const numLower = contractNumber.toLowerCase();
        found = candidates.filter(d => {
          const purpose = (d.НазначениеПлатежа || '').toLowerCase();
          return purpose.includes(numLower);
        });
        if (!found.length) found = candidates;
      } else {
        found = candidates;
      }
      if (found.length > 0) { paid = true; matchDoc = found[0]; }
    }
    results.push({
      idx, amount: adv.amount, date: adv.date,
      paid, matchDoc, checkedAt,
      contractor_matched: contractorRefKey !== null
    });
  }

  res.json({ advances: results, checkedAt, contractor_matched: contractorRefKey !== null });
}));

module.exports = router;
