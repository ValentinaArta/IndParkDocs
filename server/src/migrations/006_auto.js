const logger = require('../logger');

module.exports = async function runMigration006(pool) {
  try {
    // Rename 'Эксплуатации' → 'Обслуживания' in contract_type options
    const ctRows = await pool.query("SELECT id, options FROM field_definitions WHERE name = 'contract_type'");
    for (const row of ctRows.rows) {
      let opts = Array.isArray(row.options) ? row.options : [];
      const idx = opts.indexOf('Эксплуатации');
      if (idx !== -1) {
        opts[idx] = 'Обслуживания';
        await pool.query('UPDATE field_definitions SET options = $1::jsonb WHERE id = $2', [JSON.stringify(opts), row.id]);
      }
    }
    // Update existing contracts that have contract_type = 'Эксплуатации'
    await pool.query(`
      UPDATE entities
      SET properties = jsonb_set(properties, '{contract_type}', '"Обслуживания"')
      WHERE entity_type_id = (SELECT id FROM entity_types WHERE name = 'contract')
        AND properties->>'contract_type' = 'Эксплуатации'
    `);
    logger.info('Migration 006 applied successfully');
  } catch(e) {
    logger.error('Migration 006 error (non-fatal):', e.message);
  }
};
