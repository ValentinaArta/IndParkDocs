// Migration 003: roles, subtenant, is_own, reorder fields
require('dotenv').config({ path: __dirname + '/../../.env' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });

async function migrate() {
  const client = await pool.connect();
  try {
    // 1. contractor_name -> select_or_custom
    await client.query(`
      UPDATE field_definitions SET field_type = 'select_or_custom', options = '[]'::jsonb
      WHERE name = 'contractor_name' AND field_type = 'text'
    `);

    // 2. Add Аренды + Субаренды to contract_type options
    const ctRows = await client.query("SELECT id, options FROM field_definitions WHERE name = 'contract_type'");
    for (const row of ctRows.rows) {
      let opts = [];
      if (Array.isArray(row.options)) opts = row.options;
      else { try { opts = JSON.parse(row.options || '[]'); } catch(e) { opts = []; } }
      
      let changed = false;
      if (!opts.includes('Аренды')) { opts.splice(1, 0, 'Аренды'); changed = true; }
      if (!opts.includes('Субаренды')) {
        const idx = opts.indexOf('Аренды');
        opts.splice(idx >= 0 ? idx + 1 : 2, 0, 'Субаренды');
        changed = true;
      }
      if (changed) {
        await client.query('UPDATE field_definitions SET options = $1::jsonb WHERE id = $2', [JSON.stringify(opts), row.id]);
      }
    }

    // 3. Add changes_description to supplements
    const suppType = await client.query("SELECT id FROM entity_types WHERE name = 'supplement'");
    if (suppType.rows.length > 0) {
      await client.query(`
        INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, sort_order)
        VALUES ($1, 'changes_description', 'Что поменялось', 'text', 12)
        ON CONFLICT (entity_type_id, name) DO NOTHING
      `, [suppType.rows[0].id]);
    }

    // 4. Reorder fields + add new role/subtenant fields
    for (const tn of ['contract', 'supplement']) {
      const typeRes = await client.query("SELECT id FROM entity_types WHERE name = $1", [tn]);
      if (typeRes.rows.length === 0) continue;
      const tid = typeRes.rows[0].id;

      // Reorder existing
      const reorder = [
        ['contract_type', 0],
        ['our_legal_entity', 4],
        ['contractor_name', 6],
        ['number', 10],
        ['contract_date', 11],
      ];
      for (const [fname, ord] of reorder) {
        await client.query("UPDATE field_definitions SET sort_order = $1 WHERE entity_type_id = $2 AND name = $3", [ord, tid, fname]);
      }

      // Add new fields
      const newFields = [
        ['our_role_label', 'Роль нашей стороны', 'text', 3],
        ['contractor_role_label', 'Роль контрагента', 'text', 5],
        ['subtenant_name', 'Субарендатор', 'select_or_custom', 7],
      ];
      for (const [fname, fru, ftype, ord] of newFields) {
        await client.query(`
          INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, options, sort_order)
          VALUES ($1, $2, $3, $4, '[]'::jsonb, $5)
          ON CONFLICT (entity_type_id, name) DO UPDATE SET sort_order = $5
        `, [tid, fname, fru, ftype, ord]);
      }
    }

    // 5. Add is_own to companies
    const compType = await client.query("SELECT id FROM entity_types WHERE name = 'company'");
    if (compType.rows.length > 0) {
      await client.query(`
        INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, sort_order)
        VALUES ($1, 'is_own', 'Наше юр. лицо', 'boolean', 0)
        ON CONFLICT (entity_type_id, name) DO NOTHING
      `, [compType.rows[0].id]);
    }

    console.log('Migration 003 complete');
  } catch(e) {
    console.error('Migration 003 error:', e.message);
    // Don't exit(1) — let the server start anyway
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
