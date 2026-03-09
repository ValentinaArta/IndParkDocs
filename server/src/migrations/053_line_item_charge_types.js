const logger = require('../logger');

module.exports = async function runMigration053(pool) {
  // 1. Add charge_type, payment_date, frequency to contract_line_items
  await pool.query(`
    ALTER TABLE contract_line_items
    ADD COLUMN IF NOT EXISTS charge_type VARCHAR(30) NOT NULL DEFAULT 'Повторяющийся'
  `);
  await pool.query(`
    ALTER TABLE contract_line_items
    ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT NULL
  `);
  await pool.query(`
    ALTER TABLE contract_line_items
    ADD COLUMN IF NOT EXISTS frequency VARCHAR(30) DEFAULT 'Ежемесячно'
  `);

  // 2. Remove old contract-level charge_type and one_time_amount field definitions
  await pool.query(`
    DELETE FROM field_definitions WHERE name IN ('charge_type', 'one_time_amount')
  `);

  // 3. Clean up old charge_type/one_time_amount from entity properties
  await pool.query(`
    UPDATE entities SET properties = properties - 'charge_type' - 'one_time_amount'
    WHERE properties ? 'charge_type' OR properties ? 'one_time_amount'
  `);

  const { rowCount } = await pool.query(`SELECT 1 FROM contract_line_items LIMIT 1`);
  logger.info(`Migration 053 applied: charge_type/payment_date/frequency on contract_line_items, removed contract-level fields. ${rowCount} line items exist.`);
};
