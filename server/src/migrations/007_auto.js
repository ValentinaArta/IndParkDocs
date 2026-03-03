const logger = require('../logger');

module.exports = async function runMigration007(pool) {
  try {
    // Add contract_end_date to common contract fields (shown for all contract types)
    const contractTypeRow = await pool.query("SELECT id FROM entity_types WHERE name = 'contract'");
    if (contractTypeRow.rows.length > 0) {
      const tid = contractTypeRow.rows[0].id;
      await pool.query(`INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, sort_order)
        VALUES ($1, 'contract_end_date', 'Срок действия (до)', 'date', 12)
        ON CONFLICT (entity_type_id, name) DO NOTHING`, [tid]);
    }
    // Same for supplement type
    const suppTypeRow = await pool.query("SELECT id FROM entity_types WHERE name = 'supplement'");
    if (suppTypeRow.rows.length > 0) {
      const tid = suppTypeRow.rows[0].id;
      await pool.query(`INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, sort_order)
        VALUES ($1, 'contract_end_date', 'Срок действия (до)', 'date', 12)
        ON CONFLICT (entity_type_id, name) DO NOTHING`, [tid]);
    }
    logger.info('Migration 007 applied successfully');
  } catch(e) {
    logger.error('Migration 007 error (non-fatal):', e.message);
  }
};
