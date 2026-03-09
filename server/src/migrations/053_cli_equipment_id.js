// Migration 053: Add equipment_id to contract_line_items
module.exports = async function(pool) {
  const col = await pool.query(`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contract_line_items' AND column_name = 'equipment_id'
  `);
  if (!col.rows.length) {
    await pool.query(`ALTER TABLE contract_line_items ADD COLUMN equipment_id INTEGER REFERENCES entities(id)`);
    await pool.query(`CREATE INDEX idx_cli_equipment_id ON contract_line_items(equipment_id) WHERE equipment_id IS NOT NULL`);
  }
};
