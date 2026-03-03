// Migration 016 — extracted from index.js
const logger = require('../logger');

module.exports = async function runMigration016(pool) {
  try {
    const roomRow = await pool.query("SELECT id FROM entity_types WHERE name='room'");
    if (roomRow.rows.length === 0) { logger.info('Migration 016: room type not found, skipping'); return; }
    const roomId = roomRow.rows[0].id;
    // Hide room_number (duplicates name) and room_type (old text field, replaced by object_type from справочник)
    await pool.query(
      `UPDATE field_definitions SET sort_order = 999 WHERE entity_type_id = $1 AND name IN ('room_number', 'room_type')`,
      [roomId]);
    logger.info('Migration 016 applied: room_number and room_type hidden (sort_order=999)');
  } catch(e) {
    logger.error('Migration 016 error (non-fatal):', e.message);
  }
};
