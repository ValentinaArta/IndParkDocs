#!/usr/bin/env node
/**
 * Sync payments from 1C OData → contract_payments table.
 *
 * For each expense contract (our_role_label = 'Заказчик'):
 *   1. Find matching contract in 1C by number (Catalog_ДоговорыКонтрагентов)
 *   2. Fetch all outgoing payments (СписаниеСРасчетногоСчета) for that contract
 *   3. Upsert into contract_payments
 *
 * Usage: node sync-payments-1c.js [--dry-run] [--contract-id=123]
 */
'use strict';

const pool = require('../db');
const logger = require('../logger');

const ODATA_BASE = 'http://192.168.2.3/BF/odata/standard.odata';
const ODATA_USER = 'odata.user';
const ODATA_PASS = 'gjdbh2642!';
const AUTH_HEADER = 'Basic ' + Buffer.from(`${ODATA_USER}:${ODATA_PASS}`).toString('base64');

// Map our entity names → 1C Организация_Key for matching
const ORG_KEY_MAP = {
  'Индустриальный парк Звезда':          '1df6218d-8996-11e8-b18d-001e67301201',
  'Экспериментальный комплекс «Звезда»': '6bf16c76-8993-11e8-b18d-001e67301201',
  'Складской Терминал "Звезда"':         'd5778166-8992-11e8-b18d-001e67301201',
  'КОМПАНИЯ ГЕРМЕС ПАО':                 '9aa29c23-8991-11e8-b18d-001e67301201',
  'ОРР ВЕСТА АО':                        '5bc6a780-843a-11e8-b18d-001e67301201',
  'Техноприбор-М':                       'a58e2498-89c3-11e8-b18d-001e67301201',
  'СЦ ЗВЕЗДА ООО':                       'f1761ed4-8994-11e8-b18d-001e67301201',
  'СОК ЗВЕЗДА АО':                       '40d57818-8993-11e8-b18d-001e67301201',
};

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SINGLE_ID = (() => {
  const m = args.find(a => a.startsWith('--contract-id='));
  return m ? parseInt(m.split('=')[1]) : null;
})();

async function odataGet(path) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${ODATA_BASE}/${path}${sep}$format=json`;
  const res = await fetch(url, { headers: { Authorization: AUTH_HEADER } });
  if (!res.ok) throw new Error(`OData ${res.status}: ${url}`);
  return res.json();
}

// URL-encode Cyrillic OData entity names
const ENC_CONTRACTS = encodeURIComponent('Catalog_ДоговорыКонтрагентов');
const ENC_PAYMENTS  = encodeURIComponent('Document_СписаниеСРасчетногоСчета');

async function findContractIn1C(contractNumber) {
  const selectFields = `Ref_Key,${encodeURIComponent('Номер')},Description,${encodeURIComponent('Организация_Key')}`;
  // Try exact match first
  const filter = encodeURIComponent(`Номер eq '${contractNumber}'`);
  const data = await odataGet(`${ENC_CONTRACTS}?$filter=${filter}&$select=${selectFields}&$top=10`);
  if (data.value && data.value.length > 0) return data.value;

  // Try substring match
  const filter2 = encodeURIComponent(`substringof('${contractNumber}',Номер)`);
  const data2 = await odataGet(`${ENC_CONTRACTS}?$filter=${filter2}&$select=${selectFields}&$top=10`);
  return data2.value || [];
}

async function fetchPayments(contractRefKey) {
  const allPayments = [];
  let skip = 0;
  const pageSize = 100;

  while (true) {
    const filter = encodeURIComponent(`ДоговорКонтрагента_Key eq guid'${contractRefKey}'`);
    const select = encodeURIComponent('Ref_Key,Number,Date,СуммаДокумента,НазначениеПлатежа');
    const orderby = encodeURIComponent('Date desc');
    const data = await odataGet(
      `${ENC_PAYMENTS}?$filter=${filter}&$select=${select}&$orderby=${orderby}&$top=${pageSize}&$skip=${skip}`
    );
    const rows = data.value || [];
    allPayments.push(...rows);
    if (rows.length < pageSize) break;
    skip += pageSize;
  }
  return allPayments;
}

async function run() {
  logger.info(`sync-payments-1c: starting${DRY_RUN ? ' (DRY RUN)' : ''}${SINGLE_ID ? ` for contract ${SINGLE_ID}` : ''}`);

  // Get expense contracts
  let whereExtra = "AND e.properties->>'our_role_label' = 'Заказчик'";
  const params = [];
  if (SINGLE_ID) {
    params.push(SINGLE_ID);
    whereExtra += ` AND e.id = $1`;
  }

  const { rows: contracts } = await pool.query(`
    SELECT e.id, e.properties->>'number' AS number, e.name,
      our_ent.name AS our_entity_name
    FROM entities e
    JOIN entity_types et ON et.id = e.entity_type_id AND et.name = 'contract'
    LEFT JOIN relations r_our ON r_our.from_entity_id = e.id AND r_our.relation_type = 'our_entity' AND r_our.deleted_at IS NULL
    LEFT JOIN entities our_ent ON our_ent.id = r_our.to_entity_id
    WHERE e.deleted_at IS NULL
      AND e.properties->>'number' IS NOT NULL
      ${whereExtra}
    ORDER BY e.id
  `, params);

  logger.info(`Found ${contracts.length} expense contracts`);

  let totalMatched = 0, totalPayments = 0, totalNew = 0;

  for (const c of contracts) {
    const num = c.number.trim();
    if (!num) continue;

    try {
      let matches = await findContractIn1C(num);
      if (!matches.length) {
        logger.warn(`  [${c.id}] ${num} — not found in 1C`);
        continue;
      }

      // Filter by organization if we know it
      const expectedOrgKey = c.our_entity_name ? ORG_KEY_MAP[c.our_entity_name] : null;
      if (expectedOrgKey && matches.length > 1) {
        const filtered = matches.filter(m => m['Организация_Key'] === expectedOrgKey);
        if (filtered.length) matches = filtered;
      } else if (expectedOrgKey && matches.length === 1 && matches[0]['Организация_Key'] !== expectedOrgKey) {
        logger.warn(`  [${c.id}] ${num} — org mismatch: expected ${c.our_entity_name}, skipping`);
        continue;
      }

      totalMatched++;
      let contractPayments = 0;

      for (const m of matches) {
        const payments = await fetchPayments(m.Ref_Key);
        if (!payments.length) continue;

        for (const p of payments) {
          contractPayments++;
          totalPayments++;

          if (DRY_RUN) {
            logger.info(`  [DRY] ${c.id} | ${p.Date.substring(0, 10)} | ${p.Number} | ${p['СуммаДокумента']} | ${(p['НазначениеПлатежа'] || '').substring(0, 60)}`);
            continue;
          }

          const { rowCount } = await pool.query(`
            INSERT INTO contract_payments (contract_id, payment_date, amount, payment_number, purpose, odata_ref_key, odata_contract_key)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (contract_id, odata_ref_key) DO UPDATE
              SET payment_date = EXCLUDED.payment_date,
                  amount = EXCLUDED.amount,
                  payment_number = EXCLUDED.payment_number,
                  purpose = EXCLUDED.purpose
          `, [
            c.id,
            p.Date ? p.Date.substring(0, 10) : null,
            p['СуммаДокумента'] || 0,
            p.Number || '',
            (p['НазначениеПлатежа'] || '').substring(0, 500),
            p.Ref_Key,
            m.Ref_Key
          ]);
          if (rowCount > 0) totalNew++;
        }
      }

      logger.info(`  [${c.id}] ${num} — ${matches.length} 1C contract(s), ${contractPayments} payment(s)`);
    } catch (err) {
      logger.error(`  [${c.id}] ${num} — error: ${err.message}`);
    }
  }

  logger.info(`Done: ${totalMatched} matched, ${totalPayments} payments, ${totalNew} new/updated`);
  await pool.end();
}

run().catch(err => {
  logger.error(`sync-payments-1c fatal: ${err.message}`);
  process.exit(1);
});
