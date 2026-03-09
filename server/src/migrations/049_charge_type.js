const logger = require('../logger');

module.exports = async function runMigration049(pool) {
  try {
    for (const typeName of ['contract', 'supplement']) {
      const res = await pool.query('SELECT id FROM entity_types WHERE name = $1', [typeName]);
      if (!res.rows.length) continue;
      const tid = res.rows[0].id;

      // charge_type: Ежемесячное (default) or Разовое
      await pool.query(`
        INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, options, sort_order)
        VALUES ($1, 'charge_type', 'Тип начисления', 'select', $2, 91)
        ON CONFLICT (entity_type_id, name) DO UPDATE
          SET name_ru = EXCLUDED.name_ru, field_type = EXCLUDED.field_type, options = EXCLUDED.options, sort_order = EXCLUDED.sort_order
      `, [tid, JSON.stringify(['Ежемесячное', 'Разовое'])]);

      // one_time_amount: total for one-time contracts
      await pool.query(`
        INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, sort_order)
        VALUES ($1, 'one_time_amount', 'Сумма разовых работ', 'number', 92)
        ON CONFLICT (entity_type_id, name) DO UPDATE
          SET name_ru = EXCLUDED.name_ru, field_type = EXCLUDED.field_type, sort_order = EXCLUDED.sort_order
      `, [tid]);
    }
    logger.info('Migration 049 applied: charge_type + one_time_amount fields for contract + supplement');
  } catch (e) {
    logger.error({ msg: 'Migration 049 error', err: e.message });
    throw e;
  }
};
