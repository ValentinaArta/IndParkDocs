const logger = require('../logger');

module.exports = async function runMigration014(pool) {
  try {
    const roomRow = await pool.query("SELECT id FROM entity_types WHERE name='room'");
    if (roomRow.rows.length === 0) { logger.info('Migration 014: room type not found, skipping'); return; }
    const roomId = roomRow.rows[0].id;
    const opts = JSON.stringify(['Производство класс В', 'Производство класс С', 'Офис', 'Склад', 'ЗУ', 'Вендомат']);
    await pool.query(
      `INSERT INTO field_definitions (entity_type_id,name,name_ru,field_type,options,sort_order)
       VALUES ($1,'object_type','Тип объекта','select',$2,-1)
       ON CONFLICT (entity_type_id,name) DO UPDATE SET name_ru=EXCLUDED.name_ru,field_type=EXCLUDED.field_type,options=EXCLUDED.options,sort_order=EXCLUDED.sort_order`,
      [roomId, opts]);
    await pool.query(
      `UPDATE field_definitions SET sort_order=99 WHERE entity_type_id=$1 AND name='room_type'`,
      [roomId]);
    logger.info('Migration 014 applied: room object_type field added');
  } catch(e) {
    logger.error('Migration 014 error (non-fatal):', e.message);
  }
};
