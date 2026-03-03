const logger = require('../logger');

module.exports = async function runMigration021(pool) {
  try {
    const { rows } = await pool.query(`SELECT id FROM entity_types WHERE name='equipment'`);
    if (!rows.length) return;
    const eId = rows[0].id;
    await pool.query(`
      INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, options, sort_order)
      VALUES ($1, 'supplier', 'Поставщик', 'company_name_ref', '[]'::jsonb, 11)
      ON CONFLICT DO NOTHING
    `, [eId]);
    logger.info('runMigration021: equipment supplier field added');
  } catch(e) { logger.error('runMigration021 error (non-fatal):', e.message); }
};
