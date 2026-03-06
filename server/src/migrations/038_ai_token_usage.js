module.exports = async function migration035(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_token_usage (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      tokens_in INTEGER NOT NULL DEFAULT 0,
      tokens_out INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ai_token_usage_user_date ON ai_token_usage(user_id, date);
    ALTER TABLE ai_messages ADD COLUMN IF NOT EXISTS user_id INTEGER;
  `);
  console.log('[migration038] ai_token_usage table + ai_messages.user_id created');
};
