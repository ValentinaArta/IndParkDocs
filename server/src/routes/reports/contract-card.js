'use strict';
const express = require('express');
const pool = require('../../db');
const { authenticate } = require('../../middleware/auth');
const { asyncHandler } = require('../../middleware/errorHandler');
const { getContractDirection, isAllPartiesInternal } = require('../../utils/contractDirection');
const { _odataGetRpt, resolveRoArea, latestSuppValue, getEffectiveSrc } = require('./helpers');

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

  // 1b. Subject objects via located_in relations
  const subjectObjRes = await pool.query(
    `SELECT e.id, e.name, et.name as type_name
     FROM relations r
     JOIN entities e ON e.id = r.to_entity_id AND e.deleted_at IS NULL
     JOIN entity_types et ON et.id = e.entity_type_id
     WHERE r.from_entity_id = $1 AND r.relation_type = 'located_in'
       AND et.name IN ('room', 'building', 'land_plot')
     ORDER BY et.name, e.name`, [contractId]);
  const subjectRooms      = subjectObjRes.rows.filter(r => r.type_name === 'room');
  const subjectBuildings  = subjectObjRes.rows.filter(r => r.type_name === 'building');
  const subjectLandPlots  = subjectObjRes.rows.filter(r => r.type_name === 'land_plot');

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

  // 3. Rent objects from rent_items table (effective source: latest supp with rows, else contract)
  const rentSrc = await getEffectiveSrc(pool, contractId, 'rent_items', 'contract_id');
  const riRes = await pool.query(`
    SELECT ri.*,
           ent.name                        AS entity_name,
           ent.properties->>'area'         AS ent_area,
           ent.properties->>'object_type'  AS ent_object_type,
           bld.name                        AS building_name
    FROM rent_items ri
    LEFT JOIN entities ent ON ent.id = ri.entity_id AND ent.deleted_at IS NULL
    LEFT JOIN entities bld ON bld.id = ent.parent_id AND bld.deleted_at IS NULL
    WHERE ri.contract_id = $1
    ORDER BY ri.sort_order`, [rentSrc.id]);

  // 4. Transfer equipment: supplement with transfer_equipment=true flag (still in properties)
  let transferEquipment = [];
  let transferSourceName = '';
  for (let i = supplements.length - 1; i >= 0; i--) {
    const sp = supplements[i];
    const p = sp.properties || {};
    if (p.transfer_equipment === 'true' || p.transfer_equipment === true) {
      // Read from contract_equipment for this supplement
      const teRes = await pool.query(`
        SELECT ce.equipment_id,
               eq.name                               AS equipment_name,
               eq.properties->>'inv_number'          AS inv_number,
               eq.properties->>'equipment_category'  AS equipment_category,
               eq.properties->>'equipment_kind'      AS equipment_kind,
               eq.properties->>'status'              AS status,
               eq.properties->>'manufacturer'        AS manufacturer
        FROM contract_equipment ce
        JOIN entities eq ON eq.id = ce.equipment_id AND eq.deleted_at IS NULL
        WHERE ce.contract_id = $1
        ORDER BY ce.sort_order`, [sp.id]);
      if (teRes.rows.length) {
        transferEquipment = teRes.rows;
        transferSourceName = sp.name;
        break;
      }
    }
  }

  // 4b. Equipment rent items from contract_equipment (rows with rent_cost > 0)
  //     Effective source: latest supp with such rows, else contract itself
  const eqRentSrc = await getEffectiveSrc(pool, contractId, 'contract_equipment', 'contract_id');
  const eqRentRes = await pool.query(`
    SELECT ce.equipment_id,
           ce.rent_cost,
           eq.name                               AS equipment_name,
           eq.properties->>'inv_number'          AS inv_number,
           eq.properties->>'equipment_category'  AS equipment_category,
           eq.properties->>'equipment_kind'      AS equipment_kind,
           eq.properties->>'status'              AS status
    FROM contract_equipment ce
    JOIN entities eq ON eq.id = ce.equipment_id AND eq.deleted_at IS NULL
    WHERE ce.contract_id = $1
      AND ce.rent_cost IS NOT NULL AND ce.rent_cost > 0
    ORDER BY ce.sort_order`, [eqRentSrc.id]);

  const enrichedRentItems = eqRentRes.rows.map(item => ({
    equipment_id: item.equipment_id,
    name: item.equipment_name || '—',
    inv_number: item.inv_number || '',
    category: item.equipment_category || '',
    qty: 1,
    rate: parseFloat(item.rent_cost) || 0,
  }));
  const rentItemsMonthly = enrichedRentItems.reduce((s, i) => s + i.qty * i.rate, 0);

  // 5. Room map for rent_rows descriptions (already fetched above via ri JOIN)
  const roomPropsMapCC = {};
  riRes.rows.forEach(ri => {
    if (ri.entity_id) roomPropsMapCC[ri.entity_id] = { area: ri.ent_area };
  });

  // 6. Equipment details + located_in + broken-from-acts (for transferEquipment)
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

    // Broken status: check latest act line items
    const brokenRes = await pool.query(`
      SELECT DISTINCT ON (ali.equipment_id)
        ali.equipment_id, ali.broken
      FROM act_line_items ali
      JOIN entities a ON a.id = ali.act_id AND a.deleted_at IS NULL
      WHERE ali.equipment_id = ANY($1)
      ORDER BY ali.equipment_id,
               (a.properties->>'act_date') DESC NULLS LAST, a.id DESC`, [eqIds]);
    brokenRes.rows.forEach(r => { if (r.broken) brokenEqIds.add(r.equipment_id); });
  }

  // 7. Build rent rows from rent_items
  const rentRows = riRes.rows.map(ri => {
    const area = parseFloat(ri.area) || parseFloat(ri.ent_area) || 0;
    const rate = parseFloat(ri.rent_rate) || 0;
    const isLandPlot = ri.object_type === 'land_plot' || ri.object_type === 'land_plot_part';
    return {
      room_name: ri.entity_name || '',
      description: '',
      area, rate, monthly: area * rate,
      object_type: ri.ent_object_type || (isLandPlot ? 'Земельный участок' : '') || '',
    };
  });
  const totalMonthly = rentRows.reduce((s, r) => s + r.monthly, 0);

  // 8. Build equipment list (transferred/serviced equipment)
  const eqList = transferEquipment.map(eq => {
    const id = parseInt(eq.equipment_id);
    const d = eqMap[id] || {};
    const p = d.props || {};
    return {
      id,
      name: eq.equipment_name || d.name || '',
      inv_number: eq.inv_number || p.inv_number || '',
      category: eq.equipment_category || p.equipment_category || '',
      kind: eq.equipment_kind || p.equipment_kind || '',
      location: d.location || '',
      status: eq.status || p.status || '',
      is_emergency: (eq.status || p.status) === 'Аварийное',
      is_broken: brokenEqIds.has(id),
    };
  });

  // 9. Acts for this contract — line items from act_line_items table
  const aRes = await pool.query(
    `SELECT e.id, e.name, e.properties
     FROM entities e JOIN entity_types et ON e.entity_type_id = et.id AND et.name = 'act'
     WHERE e.parent_id = $1 AND e.deleted_at IS NULL
     ORDER BY e.properties->>'act_date' ASC NULLS LAST, e.id ASC`, [contractId]);

  const actIds = aRes.rows.map(a => a.id);
  const actLineItemsMap = {};
  if (actIds.length) {
    const aliRes = await pool.query(`
      SELECT ali.*, eq.name AS eq_db_name
      FROM act_line_items ali
      LEFT JOIN entities eq ON eq.id = ali.equipment_id AND eq.deleted_at IS NULL
      WHERE ali.act_id = ANY($1)
      ORDER BY ali.act_id, ali.sort_order`, [actIds]);
    aliRes.rows.forEach(row => {
      if (!actLineItemsMap[row.act_id]) actLineItemsMap[row.act_id] = [];
      actLineItemsMap[row.act_id].push(row);
    });
  }

  const acts = aRes.rows.map(a => {
    const p = a.properties || {};
    const items = actLineItemsMap[a.id] || [];
    const total = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const equipment = items.map(i => i.eq_db_name || i.name || '').filter(Boolean);
    return { id: a.id, name: a.name, number: p.act_number || p.number || '',
      date: p.act_date || p.contract_date || '', total, equipment, is_act: true };
  });

  // 10. Supplements history — resolve contractor names from typed relations
  const _suppContrMap = {};
  if (supplements.length > 0) {
    const _scrRes = await pool.query(
      `SELECT r.from_entity_id, e.name FROM relations r JOIN entities e ON e.id = r.to_entity_id
       WHERE r.from_entity_id = ANY($1) AND r.relation_type = 'contractor' AND r.deleted_at IS NULL`,
      [supplements.map(s => s.id)]);
    _scrRes.rows.forEach(r => { _suppContrMap[r.from_entity_id] = r.name; });
  }
  const histItems = [
    ...supplements.map(sp => {
      const p = sp.properties || {};
      return { id: sp.id, name: sp.name, number: p.number || '',
        date: p.contract_date || '', changes: p.changes_description || '',
        contractor_name: _suppContrMap[sp.id] || '', doc_status: p.doc_status || '',
        is_contract: false, is_act: false };
    }),
    ...acts,
  ].sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.id - b.id);

  const history = [
    { id: contract.id, name: contract.name, number: cProps.number || '',
      date: cProps.contract_date || '', changes: 'Основной договор', is_contract: true },
    ...histItems,
  ];

  // 11. contract_line_items (effective source: latest supp with rows, else contract)
  const cliSrc = await getEffectiveSrc(pool, contractId, 'contract_line_items', 'contract_id');
  const cliRes = await pool.query(
    'SELECT * FROM contract_line_items WHERE contract_id=$1 ORDER BY sort_order', [cliSrc.id]);
  const contractItems = cliRes.rows;

  // 11b. Collect ALL one-time items from contract + all supplements (historical)
  const allOneTimeRes = await pool.query(
    `SELECT cli.*, e.name as source_name
     FROM contract_line_items cli
     JOIN entities e ON e.id = cli.contract_id AND e.deleted_at IS NULL
     WHERE cli.charge_type = 'Разовый'
       AND (cli.contract_id = $1 OR cli.contract_id IN (
         SELECT s.id FROM entities s
         JOIN entity_types et ON et.id = s.entity_type_id AND et.name = 'supplement'
         WHERE s.parent_id = $1 AND s.deleted_at IS NULL
       ))
     ORDER BY cli.payment_date NULLS LAST, cli.sort_order`, [contractId]
  );
  const allOneTimeItems = allOneTimeRes.rows;
  // Enrich with equipment names from junction table
  if (allOneTimeItems.length) {
    const otiIds = allOneTimeItems.map(r => r.id);
    const { rows: eqLinks } = await pool.query(
      `SELECT cel.cli_id, e.id AS equipment_id, e.name AS equipment_name
       FROM cli_equipment_links cel
       JOIN entities e ON e.id = cel.equipment_id AND e.deleted_at IS NULL
       WHERE cel.cli_id = ANY($1)`, [otiIds]
    );
    const eqMap = {};
    eqLinks.forEach(l => { if (!eqMap[l.cli_id]) eqMap[l.cli_id] = []; eqMap[l.cli_id].push(l); });
    allOneTimeItems.forEach(item => {
      const links = eqMap[item.id] || [];
      item.equipment_ids = links.map(l => l.equipment_id);
      item.equipment_names = links.map(l => l.equipment_name);
    });
  }

  // For non-rental: also try direct equipment_list from contract_equipment (no rent_cost filter)
  if (eqList.length === 0) {
    const directSrc = await getEffectiveSrc(pool, contractId, 'contract_equipment', 'contract_id');
    const directRes = await pool.query(`
      SELECT ce.equipment_id,
             eq.name                               AS equipment_name,
             eq.properties->>'inv_number'          AS inv_number,
             eq.properties->>'equipment_category'  AS equipment_category,
             eq.properties->>'equipment_kind'      AS equipment_kind,
             eq.properties->>'status'              AS status
      FROM contract_equipment ce
      JOIN entities eq ON eq.id = ce.equipment_id AND eq.deleted_at IS NULL
      WHERE ce.contract_id = $1
      ORDER BY ce.sort_order`, [directSrc.id]);
    directRes.rows.forEach(eq => {
      const id = parseInt(eq.equipment_id);
      eqList.push({
        id, name: eq.equipment_name || '',
        inv_number: eq.inv_number || '',
        category: eq.equipment_category || '',
        kind: eq.equipment_kind || '',
        location: '', status: eq.status || '',
        is_emergency: eq.status === 'Аварийное', is_broken: false,
      });
    });
  }

  // Advances from contract_advances table (effective source)
  const advEffSrc = await getEffectiveSrc(pool, contractId, 'contract_advances', 'contract_id');
  const contractAdvancesRes = await pool.query(
    'SELECT amount, date FROM contract_advances WHERE contract_id=$1 ORDER BY sort_order', [advEffSrc.id]);
  const contractAdvances = contractAdvancesRes.rows.map(r => ({
    amount: r.amount !== null ? String(r.amount) : '',
    date: r.date ? r.date.toISOString().slice(0, 10) : '',
  }));

  // Effective scalar values: latest supplement overrides contract
  const effAmount   = latestSuppValue(supplements, 'contract_amount')    || cProps.contract_amount    || '';
  const effSubject  = latestSuppValue(supplements, 'subject')             || latestSuppValue(supplements, 'service_subject') || cProps.subject || cProps.service_subject || '';
  const effDurType  = latestSuppValue(supplements, 'duration_type')       || cProps.duration_type      || '';
  const effDurDate  = latestSuppValue(supplements, 'duration_date')       || latestSuppValue(supplements, 'contract_end_date') || cProps.duration_date || cProps.contract_end_date || '';
  const effDurText  = latestSuppValue(supplements, 'duration_text')       || cProps.duration_text      || '';
  const effVat      = latestSuppValue(supplements, 'vat_rate')            || cProps.vat_rate           || '';
  const effDeadline = latestSuppValue(supplements, 'completion_deadline') || cProps.completion_deadline || '';
  const effComment  = latestSuppValue(supplements, 'service_comment')     || cProps.service_comment    || '';
  // charge_type now lives on individual contract_line_items rows, not contract-level

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

  // Resolve company names from typed relations
  const _relRes = await pool.query(
    `SELECT r.relation_type, r.to_entity_id, e.name FROM relations r
     JOIN entities e ON e.id = r.to_entity_id
     WHERE r.from_entity_id = $1 AND r.relation_type IN ('contractor','our_entity','subtenant') AND r.deleted_at IS NULL`, [contractId]);
  const _relMap = {};
  const _relIdMap = {};
  _relRes.rows.forEach(r => { _relMap[r.relation_type] = r.name; _relIdMap[r.relation_type] = r.to_entity_id; });

  res.json({
    id: contract.id, name: contract.name, contract_type: cProps.contract_type || '',
    doc_status: cProps.doc_status || '',
    number: cProps.number || '', date: cProps.contract_date || '',
    our_legal_entity: _relMap.our_entity || '',
    our_role_label: cProps.our_role_label || '',
    contractor_name: _relMap.contractor || '',
    contractor_id: _relIdMap.contractor || null,
    contractor_role_label: cProps.contractor_role_label || '',
    subtenant_name: _relMap.subtenant || '',
    subtenant_id: _relIdMap.subtenant || null,
    contract_end_date: effDurDate,
    duration_type: effDurType,
    duration_text: effDurText,
    contract_amount: effAmount,
    subject: effSubject,
    building: cProps.building || '',
    tenant: cProps.tenant || '',
    vat_rate: effVat,
    advances: contractAdvances,
    completion_deadline: effDeadline,
    service_comment: effComment,
    has_power_allocation: latestSuppValue(supplements, 'has_power_allocation') || cProps.has_power_allocation || '',
    power_allocation_kw: latestSuppValue(supplements, 'power_allocation_kw')  || cProps.power_allocation_kw  || '',
    contract_items: contractItems,
    all_one_time_items: allOneTimeItems,
    cli_source_name: cliSrc.fromSupp ? cliSrc.suppName : '',
    rent_source_name: rentSrc.fromSupp ? rentSrc.suppName : '',
    transfer_source_name: transferSourceName,
    rent_rows: rentRows, total_monthly: totalMonthly,
    equipment_list: eqList, history,
    direction, is_vgo: isVgo,
    subject_rooms: effSubjectRooms,
    subject_buildings: effSubjectBuildings,
    subject_land_plots: effSubjectLandPlots,
    equipment_rent_items: enrichedRentItems,
    equipment_rent_source_name: eqRentSrc.fromSupp ? eqRentSrc.suppName : '',
    equipment_rent_monthly: rentItemsMonthly,
    payments: await (async () => {
      const { rows } = await pool.query(
        'SELECT payment_date, amount, payment_number, purpose FROM contract_payments WHERE contract_id=$1 ORDER BY payment_date DESC', [contractId]);
      return rows;
    })(),
    payments_total: await (async () => {
      const { rows: [{ total }] } = await pool.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM contract_payments WHERE contract_id=$1', [contractId]);
      return parseFloat(total);
    })(),
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

  // Advances from contract_advances table (effective source: latest supp or contract)
  const advSrc = await getEffectiveSrc(pool, contractId, 'contract_advances', 'contract_id');
  const advRes = await pool.query(
    'SELECT amount, date FROM contract_advances WHERE contract_id=$1 ORDER BY sort_order',
    [advSrc.id]);
  const advances = advRes.rows.map(r => ({
    amount: r.amount !== null ? String(r.amount) : '',
    date: r.date ? r.date.toISOString().slice(0, 10) : '',
  }));

  const checkedAt = new Date().toISOString();
  if (!advances.length) return res.json({ advances: [], checkedAt });

  const direction = getContractDirection(cProps.our_role_label || '');
  const odataDoc = direction === 'income'
    ? 'Document_ПоступлениеНаРасчетныйСчет'
    : 'Document_СписаниеСРасчетногоСчета';

  // Load contractor relation
  const _relAdvRes = await pool.query(
    `SELECT r.to_entity_id FROM relations r
     WHERE r.from_entity_id = $1 AND r.relation_type = 'contractor' AND r.deleted_at IS NULL LIMIT 1`, [contractId]);
  const contractorId = _relAdvRes.rows.length ? _relAdvRes.rows[0].to_entity_id : 0;

  let contractorRefKey = null;
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
