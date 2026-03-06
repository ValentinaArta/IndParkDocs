// sync-metabase.js — Metabase schema sync (extracted from index.js in Phase 6)
const logger = require('./logger');

async function syncMetabase() {
  const url = process.env.METABASE_URL;
  const email = process.env.METABASE_EMAIL;
  const password = process.env.METABASE_PASSWORD;
  if (!url || !email || !password) {
    logger.info('syncMetabase: skipped (METABASE_URL/EMAIL/PASSWORD not set)');
    return;
  }
  try {
    const sessRes = await fetch(`${url}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password })
    });
    if (!sessRes.ok) { logger.info('syncMetabase: auth failed', sessRes.status); return; }
    const { id: token } = await sessRes.json();

    const dbRes = await fetch(`${url}/api/database`, {
      headers: { 'X-Metabase-Session': token }
    });
    const dbData = await dbRes.json();
    const databases = dbData.data || dbData;
    const db = databases.find(d => d.details && (
      (d.details.host || '').includes('neon.tech') ||
      (d.details.dbname || '') === 'neondb'
    ));
    if (!db) { logger.info('syncMetabase: database not found in Metabase'); return; }

    await fetch(`${url}/api/database/${db.id}/sync_schema`, {
      method: 'POST',
      headers: { 'X-Metabase-Session': token }
    });
    logger.info(`syncMetabase: sync triggered for database ${db.id} (${db.name})`);
  } catch(e) {
    logger.error('syncMetabase error (non-fatal):', e.message);
  }
}

module.exports = { syncMetabase };
