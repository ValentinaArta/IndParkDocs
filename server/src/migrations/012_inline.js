// Migration 012 — extracted from index.js
const logger = require('../logger');

module.exports = async function runMigration012(pool) {
  try {
    const roomRow = await pool.query("SELECT id FROM entity_types WHERE name='room'");
    if (roomRow.rows.length === 0) { logger.info('Migration 012: room type not found, skipping'); return; }
    const roomId = roomRow.rows[0].id;
    const fields = [
      ['room_type',    'Тип помещения',      'text', null, 0],
      ['description',  'Описание помещения',  'text', null, 1],
      ['area',         'Площадь, м²',         'number', null, 2],
      ['floor',        'Этаж',                'text', null, 3],
    ];
    for (const [n,r,t,o,s] of fields) {
      await pool.query(
        `INSERT INTO field_definitions (entity_type_id,name,name_ru,field_type,options,sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (entity_type_id,name) DO UPDATE SET name_ru=$3,field_type=$4,sort_order=$6`,
        [roomId,n,r,t,o,s]);
    }
    logger.info('Migration 012 applied: room fields added');
  } catch(e) {
    logger.error('Migration 012 error (non-fatal):', e.message);
  }
};
