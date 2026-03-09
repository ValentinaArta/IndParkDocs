const logger = require('../logger');

/**
 * Migration 047: Backfill on_balance relations from properties.balance_owner_id
 * for all equipment entities.
 */
module.exports = async function migration047(pool) {
  const { rows } = await pool.query(`
    SELECT e.id, (e.properties->>'balance_owner_id')::int AS owner_id
    FROM entities e
    WHERE e.entity_type_id = (SELECT id FROM entity_types WHERE name = 'equipment')
      AND e.deleted_at IS NULL
      AND e.properties->>'balance_owner_id' IS NOT NULL
      AND e.properties->>'balance_owner_id' != ''
      AND (e.properties->>'balance_owner_id') ~ '^[0-9]+$'
  `);

  let count = 0;
  for (const row of rows) {
    if (!row.owner_id || row.owner_id < 1) continue;
    const { rows: exists } = await pool.query(
      'SELECT id FROM entities WHERE id = $1 AND deleted_at IS NULL',
      [row.owner_id]
    );
    if (!exists.length) continue;
    await pool.query(
      `INSERT INTO relations (from_entity_id, to_entity_id, relation_type)
       VALUES ($1, $2, 'on_balance')
       ON CONFLICT DO NOTHING`,
      [row.id, row.owner_id]
    );
    count++;
  }

  logger.info(`Migration 047: created ${count} on_balance relations for equipment`);
};
