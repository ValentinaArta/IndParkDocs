module.exports = async function migration026(pool) {
  // 1. Add doc_status field to contract, supplement, act, order, document entity types
  const DOC_TYPES = ['contract', 'supplement', 'act', 'order', 'document'];
  const STATUS_OPTIONS = JSON.stringify(['Создан', 'Подписан', 'Архив']);

  for (const typeName of DOC_TYPES) {
    const typeRes = await pool.query(
      'SELECT id FROM entity_types WHERE name = $1',
      [typeName]
    );
    if (!typeRes.rows.length) continue;
    const typeId = typeRes.rows[0].id;

    // Skip if field already exists
    const existing = await pool.query(
      'SELECT id FROM field_definitions WHERE entity_type_id = $1 AND name = $2',
      [typeId, 'doc_status']
    );
    if (existing.rows.length) continue;

    // Get max sort_order for this type
    const maxRes = await pool.query(
      'SELECT COALESCE(MAX(sort_order), 0) AS mx FROM field_definitions WHERE entity_type_id = $1',
      [typeId]
    );
    const nextSort = (maxRes.rows[0].mx || 0) + 1;

    await pool.query(
      `INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, options, sort_order)
       VALUES ($1, 'doc_status', 'Статус', 'select', $2, $3)`,
      [typeId, STATUS_OPTIONS, nextSort]
    );
  }

  // 2. Backfill existing entities: set doc_status = 'Подписан' where not set
  await pool.query(`
    UPDATE entities e
    SET properties = e.properties || '{"doc_status":"Подписан"}'
    WHERE e.deleted_at IS NULL
      AND (e.properties->>'doc_status') IS NULL
      AND e.entity_type_id IN (
        SELECT id FROM entity_types WHERE name = ANY($1)
      )
  `, [DOC_TYPES]);

  // 3. Migrate legal_zachety: rename 'черновик' → 'Создан'
  await pool.query(`
    UPDATE legal_zachety SET status = 'Создан' WHERE status = 'черновик' OR status IS NULL
  `);
};
