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

  // Reorder: contract_type first (sort_order=0), then role fields
  for (const typeName of ['contract', 'supplement']) {
    const typeRes = await client.query("SELECT id FROM entity_types WHERE name = $1", [typeName]);
    if (typeRes.rows.length === 0) continue;
    const tid = typeRes.rows[0].id;

    // Set contract_type as first field
    await client.query("UPDATE field_definitions SET sort_order = 0 WHERE entity_type_id = $1 AND name = 'contract_type'", [tid]);
    await client.query("UPDATE field_definitions SET sort_order = 4 WHERE entity_type_id = $1 AND name = 'our_legal_entity'", [tid]);
    await client.query("UPDATE field_definitions SET sort_order = 6 WHERE entity_type_id = $1 AND name = 'contractor_name'", [tid]);
    await client.query("UPDATE field_definitions SET sort_order = 10 WHERE entity_type_id = $1 AND name = 'number'", [tid]);
    await client.query("UPDATE field_definitions SET sort_order = 11 WHERE entity_type_id = $1 AND name = 'contract_date'", [tid]);

    // Add new fields: role labels, subtenant
    const newFields = [
      { name: 'our_role_label', name_ru: 'Роль нашей стороны', field_type: 'text', sort_order: 3 },
      { name: 'contractor_role_label', name_ru: 'Роль контрагента', field_type: 'text', sort_order: 5 },
      { name: 'subtenant_name', name_ru: 'Субарендатор', field_type: 'select_or_custom', sort_order: 7 },
    ];
    for (const f of newFields) {
      await client.query(
        "INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, options, sort_order) VALUES ($1, $2, $3, $4, '[]', $5) ON CONFLICT (entity_type_id, name) DO UPDATE SET sort_order = $5",
        [tid, f.name, f.name_ru, f.field_type, f.sort_order]
      );
    }

    // Add Субаренды to contract_type options
    const ctRes = await client.query("SELECT id, options FROM field_definitions WHERE entity_type_id = $1 AND name = 'contract_type'", [tid]);
    if (ctRes.rows.length > 0) {
      let opts = [];
      try { opts = JSON.parse(ctRes.rows[0].options || '[]'); } catch(e) {}
      if (!opts.includes('Субаренды')) {
        const idx = opts.indexOf('Аренды');
        opts.splice(idx >= 0 ? idx + 1 : 2, 0, 'Субаренды');
        await client.query('UPDATE field_definitions SET options = $1 WHERE id = $2', [JSON.stringify(opts), ctRes.rows[0].id]);
      }
    }
  }

  // Add is_own field to companies
  const compType = await client.query("SELECT id FROM entity_types WHERE name = 'company'");
  if (compType.rows.length > 0) {
    await client.query(
      "INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, sort_order) VALUES ($1, 'is_own', 'Наше юр. лицо', 'boolean', 0) ON CONFLICT (entity_type_id, name) DO NOTHING",
      [compType.rows[0].id]
    );
  }

  console.log('Migration 003 complete: roles, subtenant, is_own, reorder');
}

migrate().catch(e => { console.error(e); process.exit(1); });
