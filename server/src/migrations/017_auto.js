const logger = require('../logger');

module.exports = async function runMigration017(pool) {
  try {
    for (const typeName of ['building', 'land_plot']) {
      const res = await pool.query("SELECT id FROM entity_types WHERE name=$1", [typeName]);
      if (res.rows.length === 0) continue;
      const typeId = res.rows[0].id;
      // Check if field already exists
      const exists = await pool.query(
        "SELECT id FROM field_definitions WHERE entity_type_id=$1 AND name='short_name'", [typeId]);
      if (exists.rows.length > 0) { logger.info(`Migration 017: short_name already exists for ${typeName}`); continue; }
      // Get max sort_order to insert after all existing fields (but before hidden ones)
      const maxRes = await pool.query(
        "SELECT MAX(sort_order) as mx FROM field_definitions WHERE entity_type_id=$1 AND sort_order < 900", [typeId]);
      const nextOrder = (maxRes.rows[0].mx || 0) + 1;
      await pool.query(
        `INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, sort_order)
         VALUES ($1, 'short_name', 'Короткое имя для карты (только код, напр. 12к)', 'text', $2)
         ON CONFLICT (entity_type_id, name) DO UPDATE SET name_ru=EXCLUDED.name_ru`,
        [typeId, nextOrder]);
      logger.info(`Migration 017: added short_name to ${typeName} at sort_order ${nextOrder}`);
    }
  } catch(e) {
    logger.error('Migration 017 error (non-fatal):', e.message);
  }
};
