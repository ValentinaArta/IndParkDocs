module.exports = async function migration033(pool) {
  // 1. Rename 'connected_to' label to mark it as raw imported text
  // 2. Add new 'connected_to_id' field — equipment_selector (searchable link to equipment registry)

  const { rows: [et] } = await pool.query(
    "SELECT id FROM entity_types WHERE name = 'meter'"
  );
  if (!et) { console.warn('migration033: meter entity type not found, skipping'); return; }
  const etId = et.id;

  // Rename old text field
  await pool.query(`
    UPDATE field_definitions
    SET name_ru = '!!! Подключен к (эл.) — старое поле'
    WHERE entity_type_id = $1 AND name = 'connected_to'
  `, [etId]);

  // Shift sort_order for fields at 9+ to make room for new field at 9
  await pool.query(`
    UPDATE field_definitions
    SET sort_order = sort_order + 1
    WHERE entity_type_id = $1 AND sort_order >= 9
  `, [etId]);

  // Add new equipment_selector field at sort_order 9
  await pool.query(`
    INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, sort_order)
    VALUES ($1, 'connected_to_id', 'Подключен к (эл.)', 'equipment_selector', 9)
    ON CONFLICT (entity_type_id, name)
    DO UPDATE SET name_ru = EXCLUDED.name_ru, field_type = EXCLUDED.field_type,
                  sort_order = EXCLUDED.sort_order
  `, [etId]);
};
