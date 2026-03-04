module.exports = async function migration028(pool) {
  // Add purchase_price field to equipment entity type
  const typeRes = await pool.query(
    'SELECT id FROM entity_types WHERE name = $1',
    ['equipment']
  );
  if (!typeRes.rows.length) return;
  const typeId = typeRes.rows[0].id;

  // Skip if already exists
  const existing = await pool.query(
    'SELECT id FROM field_definitions WHERE entity_type_id = $1 AND name = $2',
    [typeId, 'purchase_price']
  );
  if (existing.rows.length) return;

  // Insert before 'note' field (find its sort_order)
  const noteRes = await pool.query(
    'SELECT sort_order FROM field_definitions WHERE entity_type_id = $1 AND name = $2',
    [typeId, 'note']
  );
  const noteSort = noteRes.rows.length ? noteRes.rows[0].sort_order : null;

  if (noteSort !== null) {
    // Shift note and fields after it up by 1
    await pool.query(
      'UPDATE field_definitions SET sort_order = sort_order + 1 WHERE entity_type_id = $1 AND sort_order >= $2',
      [typeId, noteSort]
    );
    await pool.query(
      `INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, options, sort_order)
       VALUES ($1, 'purchase_price', 'Стоимость (руб)', 'number', NULL, $2)`,
      [typeId, noteSort]
    );
  } else {
    const maxRes = await pool.query(
      'SELECT COALESCE(MAX(sort_order), 0) AS mx FROM field_definitions WHERE entity_type_id = $1',
      [typeId]
    );
    const nextSort = (maxRes.rows[0].mx || 0) + 1;
    await pool.query(
      `INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, options, sort_order)
       VALUES ($1, 'purchase_price', 'Стоимость (руб)', 'number', NULL, $2)`,
      [typeId, nextSort]
    );
  }
};
