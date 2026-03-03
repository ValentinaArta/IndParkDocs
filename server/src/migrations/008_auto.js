const logger = require('../logger');

module.exports = async function runMigration008(pool) {
  try {
    // Add vat_rate to common contract fields (shown for all types except Аренды/Субаренды
    // where it's handled in CONTRACT_TYPE_FIELDS with special rent calculation logic)
    const contractTypeRow = await pool.query("SELECT id FROM entity_types WHERE name = 'contract'");
    if (contractTypeRow.rows.length > 0) {
      const tid = contractTypeRow.rows[0].id;
      await pool.query(`INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, sort_order)
        VALUES ($1, 'vat_rate', 'в т.ч. НДС, %', 'number', 13)
        ON CONFLICT (entity_type_id, name) DO UPDATE SET name_ru = 'в т.ч. НДС, %', sort_order = 13`, [tid]);
    }
    logger.info('Migration 008 applied successfully');
  } catch(e) {
    logger.error('Migration 008 error (non-fatal):', e.message);
  }
};
