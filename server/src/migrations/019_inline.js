// Migration 019 — extracted from index.js
const logger = require('../logger');

module.exports = async function runMigration019(pool) {
  try {
    // Add payment_frequency field to contract entity type
    const ct = await pool.query(`SELECT id FROM entity_types WHERE name='contract'`);
    if (!ct.rows.length) return;
    const ctId = ct.rows[0].id;
    await pool.query(`
      INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, options, sort_order)
      VALUES ($1, 'payment_frequency', 'Периодичность оплаты', 'select_or_custom',
        '["Единовременно","Ежемесячно","Ежеквартально","Раз в полгода","Ежегодно"]'::jsonb, 14)
      ON CONFLICT DO NOTHING
    `, [ctId]);
    logger.info('runMigration019: payment_frequency field added');
  } catch(e) { logger.error('runMigration019 error (non-fatal):', e.message); }
};
