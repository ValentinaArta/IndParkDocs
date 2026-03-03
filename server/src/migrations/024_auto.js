const logger = require('../logger');

module.exports = async function runMigration024(pool) {
  try {
    // Make cadastral_number required for land_plot_part
    await pool.query(`
      UPDATE field_definitions
      SET required = true
      WHERE name = 'cadastral_number'
        AND entity_type_id = (SELECT id FROM entity_types WHERE name = 'land_plot_part');
    `);
    logger.info('runMigration024: cadastral_number required=true for land_plot_part');
  } catch(e) { logger.error('runMigration024 error (non-fatal):', e.message); }
};
