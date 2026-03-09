const logger = require('../logger');

/**
 * Migration 048: Backfill part_of relations from properties.parent_equipment_id
 * for equipment entities that already have a parent set.
 */
module.exports = async function migration048(pool) {
  const { rows } = await pool.query(`
    SELECT e.id, (e.properties->>'parent_equipment_id')::int AS parent_id
    FROM entities e
    WHERE e.entity_type_id = (SELECT id FROM entity_types WHERE name = 'equipment')
      AND e.deleted_at IS NULL
      AND e.properties->>'parent_equipment_id' IS NOT NULL
      AND e.properties->>'parent_equipment_id' != ''
      AND (e.properties->>'parent_equipment_id') ~ '^[0-9]+$'
  `);

  let count = 0;
  for (const row of rows) {
    if (!row.parent_id || row.parent_id === row.id) continue;
    const { rows: exists } = await pool.query(
      'SELECT id FROM entities WHERE id=$1 AND entity_type_id=(SELECT id FROM entity_types WHERE name=\'equipment\') AND deleted_at IS NULL',
      [row.parent_id]
    );
    if (!exists.length) continue;
    await pool.query(
      `INSERT INTO relations (from_entity_id, to_entity_id, relation_type)
       VALUES ($1, $2, 'part_of')
       ON CONFLICT DO NOTHING`,
      [row.id, row.parent_id]
    );
    count++;
  }

  logger.info(`Migration 048: created ${count} part_of relations from parent_equipment_id`);
};
