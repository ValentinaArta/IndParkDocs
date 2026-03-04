module.exports = async function migration031(pool) {
  // Add 'status' field_definition to meter entity type
  const { rows: [et] } = await pool.query(
    "SELECT id FROM entity_types WHERE name = 'meter'"
  );
  if (!et) { console.warn('migration031: meter entity type not found, skipping'); return; }
  const etId = et.id;

  await pool.query(`
    INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, options, sort_order)
    VALUES ($1, 'status', 'Статус', 'select', $2, 0)
    ON CONFLICT (entity_type_id, name)
    DO UPDATE SET name_ru = EXCLUDED.name_ru, field_type = EXCLUDED.field_type,
                  options = EXCLUDED.options, sort_order = EXCLUDED.sort_order
  `, [etId, JSON.stringify(['Установлен', 'На поверке', 'Демонтирован'])]);
};
