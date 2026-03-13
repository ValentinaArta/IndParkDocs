// Migration 063: Remove equipment_list field_definitions for act/order/letter
// Equipment is managed via contract_equipment table, act equipment via act_line_items
module.exports = async function(pool) {
  await pool.query(`
    DELETE FROM field_definitions
    WHERE field_type = 'equipment_list'
  `);
};
