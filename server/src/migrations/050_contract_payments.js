const logger = require('../logger');

module.exports = async function runMigration050(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contract_payments (
      id              SERIAL PRIMARY KEY,
      contract_id     INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      payment_date    DATE,
      amount          NUMERIC(14,2),
      payment_number  TEXT,
      purpose         TEXT,
      odata_ref_key   TEXT,
      odata_contract_key TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (contract_id, odata_ref_key)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_contract_payments_contract ON contract_payments(contract_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_contract_payments_date ON contract_payments(payment_date)`);
  logger.info('Migration 050 applied: contract_payments table created');
};
