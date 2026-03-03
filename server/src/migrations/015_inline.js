// Migration 015 — extracted from index.js
const logger = require('../logger');

module.exports = async function runMigration015(pool) {
  try {
    const roomRow = await pool.query("SELECT id FROM entity_types WHERE name='room'");
    if (roomRow.rows.length === 0) { logger.info('Migration 015: room type not found, skipping'); return; }
    const roomId = roomRow.rows[0].id;

    // Collect distinct object_type values actually used in room entities
    const { rows: usedRows } = await pool.query(`
      SELECT DISTINCT e.properties->>'object_type' AS val
      FROM entities e
      WHERE e.entity_type_id = $1
        AND e.deleted_at IS NULL
        AND e.properties->>'object_type' IS NOT NULL
        AND e.properties->>'object_type' != ''
      ORDER BY 1
    `, [roomId]);
    const used = usedRows.map(r => r.val);

    // Existing options in справочник
    const { rows: fdRows } = await pool.query(
      `SELECT options FROM field_definitions WHERE entity_type_id=$1 AND name='object_type'`, [roomId]);
    let existing = [];
    if (fdRows.length > 0 && fdRows[0].options) {
      try { existing = Array.isArray(fdRows[0].options) ? fdRows[0].options : JSON.parse(fdRows[0].options); } catch(e) {}
    }

    // Merge: existing + used, deduplicate, remove ЗУ/Вендомат (not room types)
    const notRoomTypes = ['ЗУ', 'Вендомат'];
    const merged = [...new Set([...existing, ...used])].filter(v => !notRoomTypes.includes(v)).sort();

    await pool.query(
      `UPDATE field_definitions SET name_ru='Тип помещения', field_type='select_or_custom', options=$1::jsonb
       WHERE entity_type_id=$2 AND name='object_type'`,
      [JSON.stringify(merged), roomId]);

    logger.info('Migration 015 applied: room object_type options populated from DB:', merged);
  } catch(e) {
    logger.error('Migration 015 error (non-fatal):', e.message);
  }
};
