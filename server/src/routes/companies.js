/**
 * companies.js
 * Маршруты для работы с компаниями: поиск, синхронизация с 1С по ИНН.
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const logger = require('../logger');

const ONEC_URL = process.env.ONEC_URL || 'http://192.168.2.3/BF/odata/standard.odata';
const ONEC_USER = process.env.ONEC_USER || 'odata.user';
const ONEC_PASS = process.env.ONEC_PASS || 'gjdbh2642!';
const ONEC_AUTH = 'Basic ' + Buffer.from(`${ONEC_USER}:${ONEC_PASS}`).toString('base64');

/** Загрузить из 1С: Catalog_Организации (наши компании) */
async function fetchOnecOrganizations() {
  const url = `${ONEC_URL}/Catalog_Организации?$format=json&$select=ИНН,КПП,Description,НаименованиеПолное`;
  const res = await fetch(url, { headers: { Authorization: ONEC_AUTH }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`1С Организации: HTTP ${res.status}`);
  const data = await res.json();
  return (data.value || []).filter(o => o.ИНН);
}

/** Поиск в 1С: Catalog_Контрагенты по названию или ИНН.
 *  Важно: contains/tolower не поддерживаются этой 1С OData.
 *  Работает: substringof (регистронезависимо), ИНН eq, $orderby (снимает AUTOORDER).
 */
async function searchOnecCounterparties(q) {
  const isInn = /^\d{10,12}$/.test(q.trim());
  const baseFilter = isInn
    ? `ИНН eq '${q.trim()}'`
    : `substringof('${q.replace(/'/g, '')}',Description)`;
  const filter = `${baseFilter} and DeletionMark eq false and IsFolder eq false`;
  const url = `${ONEC_URL}/Catalog_Контрагенты?$format=json&$orderby=Description&$top=20&$select=Ref_Key,Description,ИНН,КПП,НаименованиеПолное&$filter=${encodeURIComponent(filter)}`;
  const res = await fetch(url, { headers: { Authorization: ONEC_AUTH }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    logger.warn({ msg: '1С counterparty search failed', status: res.status, q });
    return [];
  }
  const data = await res.json();
  if (data['odata.error']) {
    logger.warn({ msg: '1С counterparty search odata error', err: data['odata.error'], q });
    return [];
  }
  return (data.value || []).filter(o => o.Description && o.Description !== 'Физические лица');
}

/**
 * GET /api/companies/search?q=...
 * Поиск компаний: сначала IndParkDocs, при 0 результатах — 1С.
 */
router.get('/search', authenticate, asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) return res.json({ local: [], onec: [], source: 'local' });

  try {
    // 1. Ищем в IndParkDocs
    const localRes = await pool.query(
      `SELECT e.id, e.name,
              e.properties->>'inn' AS inn,
              e.properties->>'kpp' AS kpp,
              e.properties->>'is_own' AS is_own,
              e.properties->>'onec_ref_key' AS onec_ref_key
       FROM entities e
       JOIN entity_types et ON et.id = e.entity_type_id AND et.name = 'company'
       WHERE e.deleted_at IS NULL
         AND (e.name ILIKE $1 OR e.properties->>'inn' ILIKE $1)
       ORDER BY e.name LIMIT 30`,
      [`%${q}%`]
    );

    if (localRes.rows.length > 0) {
      return res.json({ local: localRes.rows, onec: [], source: 'local' });
    }

    // 2. Ничего нет в IndParkDocs — идём в 1С
    let onec = [];
    try {
      const raw = await searchOnecCounterparties(q);
      onec = raw.map(o => ({
        ref_key: o.Ref_Key,
        name: o.Description,
        full_name: o.НаименованиеПолное || o.Description,
        inn: o.ИНН || '',
        kpp: o.КПП || '',
      }));
    } catch (e) {
      logger.warn({ msg: '1С search failed', err: e.message });
    }

    return res.json({ local: [], onec, source: onec.length > 0 ? '1c' : 'none' });
  } catch (err) {
    logger.error({ msg: 'companies/search error', err: err.message });
    res.status(500).json({ error: 'Ошибка поиска' });
  }
}));

/**
 * POST /api/companies/import-from-1c
 * Создать компанию в IndParkDocs из данных 1С.
 * Body: { ref_key, name, full_name, inn, kpp }
 */
router.post('/import-from-1c', authenticate, asyncHandler(async (req, res) => {
  const { ref_key, name, full_name, inn, kpp } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  try {
    // Проверить дубликат по ИНН
    if (inn) {
      const dup = await pool.query(
        `SELECT e.id, e.name FROM entities e
         JOIN entity_types et ON et.id = e.entity_type_id AND et.name = 'company'
         WHERE e.deleted_at IS NULL AND e.properties->>'inn' = $1 LIMIT 1`,
        [inn]
      );
      if (dup.rows.length > 0) {
        return res.json({ id: dup.rows[0].id, name: dup.rows[0].name, existed: true });
      }
    }

    // Проверить дубликат по имени
    const dupName = await pool.query(
      `SELECT e.id, e.name FROM entities e
       JOIN entity_types et ON et.id = e.entity_type_id AND et.name = 'company'
       WHERE e.deleted_at IS NULL AND LOWER(e.name) = LOWER($1) LIMIT 1`,
      [name]
    );
    if (dupName.rows.length > 0) {
      return res.json({ id: dupName.rows[0].id, name: dupName.rows[0].name, existed: true });
    }

    const etRes = await pool.query(`SELECT id FROM entity_types WHERE name = 'company' LIMIT 1`);
    const typeId = etRes.rows[0].id;
    const props = { inn: inn || '', kpp: kpp || '', onec_ref_key: ref_key || '', is_own: false };
    if (full_name && full_name !== name) props.full_name = full_name;

    const ins = await pool.query(
      `INSERT INTO entities (entity_type_id, name, properties) VALUES ($1, $2, $3) RETURNING id, name`,
      [typeId, name, props]
    );
    res.json({ id: ins.rows[0].id, name: ins.rows[0].name, existed: false });
  } catch (err) {
    logger.error({ msg: 'import-from-1c error', err: err.message });
    res.status(500).json({ error: 'Ошибка импорта' });
  }
}));

/**
 * POST /api/companies/sync-inn  (admin)
 * Обогатить существующие компании из 1С по ИНН:
 * — совпадение с Организации → is_own = true
 * — обновить kpp, onec_ref_key
 */
router.post('/sync-inn', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  try {
    const orgs = await fetchOnecOrganizations();
    const ownInns = new Set(orgs.map(o => o.ИНН));

    // Получить все компании с ИНН
    const companies = await pool.query(
      `SELECT e.id, e.name, e.properties
       FROM entities e
       JOIN entity_types et ON et.id = e.entity_type_id AND et.name = 'company'
       WHERE e.deleted_at IS NULL AND e.properties->>'inn' IS NOT NULL AND e.properties->>'inn' != ''`
    );

    let updated = 0, skipped = 0;
    for (const row of companies.rows) {
      const inn = (row.properties.inn || '').trim();
      if (!inn) { skipped++; continue; }

      const org = orgs.find(o => o.ИНН === inn);
      const isOwn = ownInns.has(inn);

      const patch = { ...row.properties };
      let changed = false;

      if (isOwn && patch.is_own !== 'true' && patch.is_own !== true) {
        patch.is_own = true; changed = true;
      }
      if (org && org.КПП && !patch.kpp) {
        patch.kpp = org.КПП; changed = true;
      }

      if (changed) {
        await pool.query(`UPDATE entities SET properties = $1 WHERE id = $2`, [patch, row.id]);
        updated++;
        logger.info({ msg: 'sync-inn updated', id: row.id, name: row.name, isOwn, kpp: org?.КПП });
      } else {
        skipped++;
      }
    }

    res.json({ updated, skipped, total: companies.rows.length });
  } catch (err) {
    logger.error({ msg: 'sync-inn error', err: err.message });
    res.status(500).json({ error: err.message });
  }
}));

module.exports = router;
