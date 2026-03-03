// Migration 022 — extracted from index.js
const logger = require('../logger');

module.exports = async function runMigration022(pool) {
  try {
    const { rows } = await pool.query(`SELECT id FROM entity_types WHERE name='contract'`);
    if (!rows.length) return;
    const ctId = rows[0].id;
    await pool.query(`
      INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, options, sort_order)
      VALUES ($1, 'sale_item_type', 'Типы предметов КП', 'select',
        '["Оборудование","Корпус","Прочее"]'::jsonb, 999)
      ON CONFLICT DO NOTHING
    `, [ctId]);
    logger.info('runMigration022: sale_item_type справочник field added');
  } catch(e) { logger.error('runMigration022 error (non-fatal):', e.message); }
};
