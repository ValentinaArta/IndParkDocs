module.exports = async function migration032(pool) {
  // Add missing field_definitions for 'building' entity type:
  // short_name, cadastral_number, cadastral_value, cadastral_value_date
  const { rows: [et] } = await pool.query(
    "SELECT id FROM entity_types WHERE name = 'building'"
  );
  if (!et) { console.warn('migration032: building entity type not found, skipping'); return; }
  const etId = et.id;

  const fields = [
    { name: 'short_name',           name_ru: 'Краткое название',          field_type: 'text',   sort_order: 2 },
    { name: 'cadastral_number',     name_ru: 'Кадастровый номер',         field_type: 'text',   sort_order: 3 },
    { name: 'cadastral_value',      name_ru: 'Кадастровая стоимость, руб.', field_type: 'number', sort_order: 4 },
    { name: 'cadastral_value_date', name_ru: 'Дата кадастровой оценки',   field_type: 'date',   sort_order: 5 },
  ];

  for (const f of fields) {
    await pool.query(`
      INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, sort_order)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (entity_type_id, name)
      DO UPDATE SET name_ru = EXCLUDED.name_ru, field_type = EXCLUDED.field_type,
                    sort_order = EXCLUDED.sort_order
    `, [etId, f.name, f.name_ru, f.field_type, f.sort_order]);
  }
};
