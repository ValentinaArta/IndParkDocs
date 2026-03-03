const logger = require('../logger');

module.exports = async function runMigration020(pool) {
  try {
    const { rows } = await pool.query(`SELECT id FROM entity_types WHERE name='company'`);
    if (!rows.length) return;
    const cId = rows[0].id;
    await pool.query(`
      INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, options, sort_order)
      VALUES
        ($1, 'ownership_structure', 'Структура владения', 'text', '[]'::jsonb, 20),
        ($1, 'contacts', 'Контактные лица', 'contacts', '[]'::jsonb, 21)
      ON CONFLICT DO NOTHING
    `, [cId]);
    logger.info('runMigration020: company ownership_structure + contacts added');
  } catch(e) { logger.error('runMigration020 error (non-fatal):', e.message); }
};
