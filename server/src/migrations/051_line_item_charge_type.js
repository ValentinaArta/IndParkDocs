const logger = require('../logger');

module.exports = async function runMigration051(pool) {
  // Add charge_type column to contract_line_items (per-line recurring/one_time)
  await pool.query(`
    ALTER TABLE contract_line_items
    ADD COLUMN IF NOT EXISTS charge_type VARCHAR(20) NOT NULL DEFAULT 'recurring'
  `);
  // Also remove contract-level charge_type field definitions (no longer needed)
  await pool.query(`
    DELETE FROM field_definitions WHERE name IN ('charge_type', 'one_time_amount')
  `);
  logger.info('Migration 051 applied: charge_type on contract_line_items, removed contract-level fields');
};
