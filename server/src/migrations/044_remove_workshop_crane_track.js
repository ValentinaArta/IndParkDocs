// Migration 044: Remove obsolete entity types workshop and crane_track
// These types were never populated (0 entities in DB) and were just aliases:
//   workshop    → use 'building' instead
//   crane_track → use 'equipment' with category 'Крановое хозяйство' instead
module.exports = async function (pool) {
  // Remove field_definitions tied to these types (if any)
  await pool.query(`
    DELETE FROM field_definitions
    WHERE entity_type_id IN (
      SELECT id FROM entity_types WHERE name IN ('workshop', 'crane_track')
    )
  `);

  // Remove the entity types themselves
  await pool.query(`
    DELETE FROM entity_types WHERE name IN ('workshop', 'crane_track')
  `);
};
