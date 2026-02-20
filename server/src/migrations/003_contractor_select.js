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

  // Add changes_description field to supplements
  const suppType = await client.query("SELECT id FROM entity_types WHERE name = 'supplement'");
  if (suppType.rows.length > 0) {
    const tid = suppType.rows[0].id;
    await client.query(`
      INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, sort_order)
      VALUES ($1, 'changes_description', 'Что поменялось', 'text', 5)
      ON CONFLICT (entity_type_id, name) DO NOTHING
    `, [tid]);
  }

  console.log('Migration 003: contractor_name -> select_or_custom, added Аренды, changes_description');
}

migrate().catch(e => { console.error(e); process.exit(1); });
