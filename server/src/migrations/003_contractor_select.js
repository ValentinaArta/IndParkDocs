// Migration: Change contractor_name to select_or_custom and add Аренды to contract_type options
require('dotenv').config({ path: __dirname + '/../../.env' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });

async function migrate() {
  const client = await pool.connect();
  try { await run(client); } finally { client.release(); await pool.end(); }
}

async function run(client) {
  // Update contractor_name field_type for contracts
  await client.query(`
    UPDATE field_definitions SET field_type = 'select_or_custom', options = '[]'
    WHERE name = 'contractor_name' AND field_type = 'text'
  `);

  // Add Аренды to contract_type options if not already there
  const res = await client.query(`
    SELECT id, options FROM field_definitions WHERE name = 'contract_type'
  `);
  for (const row of res.rows) {
    let opts = [];
    try { opts = JSON.parse(row.options || '[]'); } catch(e) {}
    if (!opts.includes('Аренды')) {
      opts.splice(1, 0, 'Аренды'); // Insert after Подряда
      await client.query('UPDATE field_definitions SET options = $1 WHERE id = $2', [JSON.stringify(opts), row.id]);
    }
  }

  console.log('Migration 003: contractor_name -> select_or_custom, added Аренды');
}

migrate().catch(e => { console.error(e); process.exit(1); });
