const logger = require('../logger');

/**
 * Migration 040: Create typed relations (contractor, our_entity, subtenant)
 * from properties->contractor_id, our_legal_entity_id, subtenant_id.
 * 
 * This is Phase 1 of the relations migration: data exists in BOTH
 * properties and relations temporarily. Properties cleanup is Phase 5.
 */
module.exports = async function runMigration040(pool) {
  const mappings = [
    { propKey: 'contractor_id',        relType: 'contractor' },
    { propKey: 'our_legal_entity_id',  relType: 'our_entity' },
    { propKey: 'subtenant_id',         relType: 'subtenant' },
  ];

  let totalCreated = 0;

  for (const { propKey, relType } of mappings) {
    const result = await pool.query(`
      INSERT INTO relations (from_entity_id, to_entity_id, relation_type)
      SELECT e.id, (e.properties->>$1)::int, $2
      FROM entities e
      JOIN entity_types t ON t.id = e.entity_type_id AND t.name IN ('contract', 'supplement')
      WHERE e.deleted_at IS NULL
        AND e.properties->>$1 IS NOT NULL
        AND (e.properties->>$1)::int > 0
        AND EXISTS (SELECT 1 FROM entities target WHERE target.id = (e.properties->>$1)::int AND target.deleted_at IS NULL)
      ON CONFLICT (from_entity_id, to_entity_id, relation_type) DO NOTHING
    `, [propKey, relType]);

    totalCreated += result.rowCount;
    logger.info(`Migration 040: created ${result.rowCount} '${relType}' relations from '${propKey}'`);
  }

  logger.info(`Migration 040 complete: ${totalCreated} typed relations created total`);
};
