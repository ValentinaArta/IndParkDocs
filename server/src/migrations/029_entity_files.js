const logger = require('../logger');

module.exports = async function runMigration029(pool) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS entity_files (
        id            SERIAL PRIMARY KEY,
        entity_id     INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
        filename      TEXT NOT NULL,
        original_name TEXT NOT NULL,
        size          INTEGER NOT NULL DEFAULT 0,
        mimetype      TEXT NOT NULL DEFAULT 'application/octet-stream',
        uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_entity_files_entity_id
        ON entity_files(entity_id)
    `);
    logger.info('Migration 029 applied: entity_files table created');
  } catch (e) {
    logger.error({ msg: 'Migration 029 error', err: e.message });
    throw e;
  }
};
