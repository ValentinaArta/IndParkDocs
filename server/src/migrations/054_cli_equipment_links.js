// Migration 054: junction table for multi-equipment on contract_line_items
module.exports = async function(pool) {
  const tbl = await pool.query(`
    SELECT 1 FROM information_schema.tables WHERE table_name = 'cli_equipment_links'
  `);
  if (!tbl.rows.length) {
    await pool.query(`
      CREATE TABLE cli_equipment_links (
        id SERIAL PRIMARY KEY,
        cli_id INTEGER NOT NULL REFERENCES contract_line_items(id) ON DELETE CASCADE,
        equipment_id INTEGER NOT NULL REFERENCES entities(id),
        UNIQUE(cli_id, equipment_id)
      )
    `);
    await pool.query(`CREATE INDEX idx_cel_equipment ON cli_equipment_links(equipment_id)`);
    // Migrate existing equipment_id data
    await pool.query(`
      INSERT INTO cli_equipment_links (cli_id, equipment_id)
      SELECT id, equipment_id FROM contract_line_items WHERE equipment_id IS NOT NULL
      ON CONFLICT DO NOTHING
    `);
    // Drop old column
    await pool.query(`ALTER TABLE contract_line_items DROP COLUMN IF EXISTS equipment_id`);
  }
};
