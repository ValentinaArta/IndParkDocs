// Migration 010 — extracted from index.js
const logger = require('../logger');

module.exports = async function runMigration010(pool) {
  try {
    const actId = (await pool.query("SELECT id FROM entity_types WHERE name='act'")).rows[0]?.id;
    if (!actId) { logger.info('Migration 010: act type not found, skipping'); return; }
    // Add conclusion field to act (sort_order 7)
    await pool.query(
      `INSERT INTO field_definitions (entity_type_id,name,name_ru,field_type,options,sort_order)
       VALUES ($1,'conclusion','Заключение','textarea',NULL,7)
       ON CONFLICT (entity_type_id,name) DO NOTHING`,
      [actId]
    );
    // Change comment field to textarea for better UX on long texts
    await pool.query(
      `UPDATE field_definitions SET field_type='textarea' WHERE entity_type_id=$1 AND name='comment'`,
      [actId]
    );
    logger.info('Migration 010 applied successfully');
  } catch(e) {
    logger.error('Migration 010 error (non-fatal):', e.message);
  }
};
