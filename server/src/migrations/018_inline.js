// Migration 018 — extracted from index.js
const logger = require('../logger');

module.exports = async function runMigration018(pool) {
  try {
    // Update area field label to кв.м. for land_plot
    const res = await pool.query("SELECT id FROM entity_types WHERE name='land_plot'");
    if (res.rows.length === 0) return;
    const typeId = res.rows[0].id;
    await pool.query(
      `UPDATE field_definitions SET name_ru = 'Площадь, кв.м.'
       WHERE entity_type_id=$1 AND name='area' AND name_ru != 'Площадь, кв.м.'`,
      [typeId]);
    logger.info('Migration 018: area field unit updated to кв.м.');
  } catch(e) {
    logger.error('Migration 018 error (non-fatal):', e.message);
  }
};
