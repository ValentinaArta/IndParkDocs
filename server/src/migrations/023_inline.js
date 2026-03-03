// Migration 023 — extracted from index.js
const logger = require('../logger');

module.exports = async function runMigration023(pool) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_messages (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL DEFAULT 'default',
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_messages_session ON ai_messages(session_id, created_at);
    `);
    logger.info('runMigration023: ai_messages table created');
  } catch(e) { logger.error('runMigration023 error (non-fatal):', e.message); }
};
