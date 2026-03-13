'use strict';
const http = require('http');

const ODATA_BASE_RPT = process.env.ODATA_BASE_URL || 'http://192.168.2.3/BF/odata/standard.odata';
const ODATA_AUTH_RPT = 'Basic ' + Buffer.from(
  (process.env.ODATA_USER || '') + ':' + (process.env.ODATA_PASS || '')
).toString('base64');

function _odataGetRpt(path) {
  return new Promise((resolve) => {
    const url = ODATA_BASE_RPT + '/' + path;
    const req = http.get(url, { headers: { Authorization: ODATA_AUTH_RPT } }, (r) => {
      let data = '';
      r.on('data', c => { data += c; });
      r.on('end', () => { try { resolve(JSON.parse(data)); } catch (_) { resolve({ value: [] }); } });
    });
    req.setTimeout(15000, () => { req.destroy(); resolve({ value: [] }); });
    req.on('error', () => resolve({ value: [] }));
  });
}

/**
 * Resolve actual area for a rent_objects item.
 * Stored ro.area takes priority (e.g. partial ЗУ or overridden value).
 * Falls back to room's DB properties.area when ro.area is absent.
 * @param {object} ro - rent_objects row
 * @param {object} roomPropsMap - map of room id → properties (pre-fetched from DB)
 */
function resolveRoArea(ro, roomPropsMap) {
  const stored = parseFloat(ro.area);
  if (stored > 0) return stored;
  const roomId = parseInt(ro.room_id) || 0;
  if (roomId && roomPropsMap && roomPropsMap[roomId]) {
    return parseFloat(roomPropsMap[roomId].area) || 0;
  }
  return 0;
}

/**
 * Get value from the most recent supplement where the field is non-empty.
 * Skips future supplements (date > today).
 */
function latestSuppValue(supplements, fieldName) {
  const today = new Date().toISOString().slice(0, 10);
  for (let i = supplements.length - 1; i >= 0; i--) {
    const s = supplements[i];
    const sDate = (s.properties || {}).contract_date || '';
    if (sDate && sDate > today) continue;
    const v = (s.properties || {})[fieldName];
    if (v !== undefined && v !== null && v !== '' && v !== '[]' && v !== 'null') return v;
  }
  return null;
}

/**
 * Find the effective source entity for a normalized line-items table.
 * Returns the latest supplement's ID (if it has rows in the table),
 * or the contractId itself as fallback.
 *
 * Safe: tableName and fkCol are always hardcoded call-site constants.
 * @param {Pool} pool
 * @param {number} contractId
 * @param {string} tableName  - e.g. 'rent_items'
 * @param {string} fkCol      - FK column name, e.g. 'contract_id'
 * @returns {Promise<{id: number, fromSupp: boolean, suppName: string, suppDate: string}>}
 */
async function getEffectiveSrc(pool, contractId, tableName, fkCol) {
  const allowed = {
    rent_items: 'contract_id',
    contract_equipment: 'contract_id',
    contract_line_items: 'contract_id',
    contract_advances: 'contract_id',
  };
  if (allowed[tableName] !== fkCol) throw new Error('Invalid table/fk combination: ' + tableName + '.' + fkCol);

  // Find the latest supplement that HAS rows in this table
  const q = `
    SELECT s.id, s.name, s.properties->>'contract_date' AS supp_date
    FROM entities s
    JOIN entity_types et ON et.id = s.entity_type_id AND et.name = 'supplement'
    WHERE s.parent_id = $1 AND s.deleted_at IS NULL
      AND EXISTS (SELECT 1 FROM ${tableName} t WHERE t.${fkCol} = s.id)
    ORDER BY s.properties->>'contract_date' DESC NULLS LAST, s.id DESC
    LIMIT 1`;
  const { rows } = await pool.query(q, [contractId]);
  if (rows.length) return { id: rows[0].id, fromSupp: true, suppName: rows[0].name || '', suppDate: rows[0].supp_date || '' };
  return { id: contractId, fromSupp: false, suppName: '', suppDate: '' };
}

module.exports = { _odataGetRpt, resolveRoArea, latestSuppValue, getEffectiveSrc, ODATA_BASE_RPT, ODATA_AUTH_RPT };
