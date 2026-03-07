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

module.exports = { _odataGetRpt, resolveRoArea, latestSuppValue, ODATA_BASE_RPT, ODATA_AUTH_RPT };
