// Migration 062: Remove legacy transfer_equipment property and field_definition
// Equipment is now fully managed via contract_equipment table
module.exports = async function(pool) {
  // Remove transfer_equipment from properties (55 entities)
  await pool.query(`
    UPDATE entities
    SET properties = properties - 'transfer_equipment'
    WHERE properties ? 'transfer_equipment'
  `);

  // Remove field_definition for transfer_equipment
  await pool.query(`
    DELETE FROM field_definitions
    WHERE name = 'transfer_equipment'
  `);
};
