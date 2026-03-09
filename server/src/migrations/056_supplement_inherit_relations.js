'use strict';
/**
 * Migration 056: Ensure all supplements inherit typed relations from parent contract.
 * Creates contractor, our_entity, subtenant relations for supplements that lack them.
 * Also fixes supplement names missing contractor name.
 */
module.exports = async function migrate056(pool) {
  const relTypes = ['contractor', 'our_entity', 'subtenant'];
  let total = 0;
  for (const rt of relTypes) {
    const { rowCount } = await pool.query(`
      INSERT INTO relations (from_entity_id, to_entity_id, relation_type)
      SELECT s.id, parent_rel.to_entity_id, '${rt}'
      FROM entities s
      JOIN entity_types et ON et.id = s.entity_type_id AND et.name = 'supplement'
      JOIN relations parent_rel ON parent_rel.from_entity_id = s.parent_id
        AND parent_rel.relation_type = '${rt}' AND parent_rel.deleted_at IS NULL
      WHERE s.deleted_at IS NULL AND s.parent_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM relations r
          WHERE r.from_entity_id = s.id AND r.relation_type = '${rt}' AND r.deleted_at IS NULL
        )
      ON CONFLICT DO NOTHING
    `);
    total += rowCount;
  }

  // Fix supplement names missing contractor
  const { rowCount: namesFixed } = await pool.query(`
    UPDATE entities s
    SET name = 'ДС №' || COALESCE(s.properties->>'number', '') || ' — ' || ce.name
    FROM relations r
    JOIN entities ce ON ce.id = r.to_entity_id
    WHERE r.from_entity_id = s.id AND r.relation_type = 'contractor' AND r.deleted_at IS NULL
      AND s.entity_type_id = (SELECT id FROM entity_types WHERE name = 'supplement')
      AND s.deleted_at IS NULL
      AND s.name !~ ' — '
      AND ce.name IS NOT NULL AND ce.name != ''
  `);

  console.log(`  [056] Inherited ${total} typed relations for supplements, fixed ${namesFixed} names`);
};
