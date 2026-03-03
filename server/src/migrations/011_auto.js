const logger = require('../logger');

module.exports = async function runMigration011(pool) {
  try {
    await pool.query(
      `UPDATE field_definitions
       SET options = $1
       WHERE name = 'status'
         AND entity_type_id = (SELECT id FROM entity_types WHERE name = 'equipment')
         AND NOT (options::jsonb @> '"Аварийное"'::jsonb)`,
      [JSON.stringify(['В работе','На ремонте','Законсервировано','Списано','Аварийное'])]
    );
    logger.info('Migration 011 applied: added Аварийное status for equipment');
  } catch(e) {
    logger.error('Migration 011 error (non-fatal):', e.message);
  }
};
