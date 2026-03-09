const logger = require('../logger');

/**
 * Migration 049: Unify equipment↔contract links.
 * 1. Copy any subject_of (equipment→contract/supplement) into contract_equipment
 * 2. Delete those subject_of relations (keep subject_of for equipment→act)
 */
module.exports = async function migration049(pool) {
  // Step 1: insert missing records into contract_equipment
  const { rowCount: inserted } = await pool.query(`
    INSERT INTO contract_equipment (contract_id, equipment_id, sort_order)
    SELECT r.to_entity_id, r.from_entity_id, 999
    FROM relations r
    JOIN entities eq ON eq.id = r.from_entity_id AND eq.entity_type_id = (SELECT id FROM entity_types WHERE name = 'equipment')
    JOIN entities c ON c.id = r.to_entity_id
    JOIN entity_types ct ON ct.id = c.entity_type_id AND ct.name IN ('contract', 'supplement')
    WHERE r.relation_type = 'subject_of'
      AND r.deleted_at IS NULL
      AND eq.deleted_at IS NULL
      AND c.deleted_at IS NULL
    ON CONFLICT DO NOTHING
  `);

  // Step 2: delete subject_of relations for equipment→contract/supplement
  const { rowCount: deleted } = await pool.query(`
    DELETE FROM relations r
    USING entities eq, entities c, entity_types ct
    WHERE r.from_entity_id = eq.id
      AND r.to_entity_id = c.id
      AND eq.entity_type_id = (SELECT id FROM entity_types WHERE name = 'equipment')
      AND ct.id = c.entity_type_id
      AND ct.name IN ('contract', 'supplement')
      AND r.relation_type = 'subject_of'
  `);

  logger.info(`Migration 049: inserted ${inserted} into contract_equipment, deleted ${deleted} subject_of relations (equipment→contract)`);
};
