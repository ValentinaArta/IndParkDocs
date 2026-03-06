// 037_subject_fields_for_acts_letters_orders.js
// Добавляет 5 полей объектов (корпуса/помещения/ЗУ/части ЗУ/оборудование)
// в field_definitions для сущностей: act, order, letter.

module.exports = async function(pool) {
  const subjectFields = [
    { name: 'subject_buildings',      name_ru: 'Корпуса',             field_type: 'subject_buildings',      sort_order: 100 },
    { name: 'subject_rooms',          name_ru: 'Помещения',           field_type: 'subject_rooms',           sort_order: 101 },
    { name: 'subject_land_plots',     name_ru: 'Земельные участки',   field_type: 'subject_land_plots',      sort_order: 102 },
    { name: 'subject_land_plot_parts',name_ru: 'Части ЗУ',            field_type: 'subject_land_plot_parts', sort_order: 103 },
    { name: 'equipment_list',         name_ru: 'Оборудование',        field_type: 'equipment_list',          sort_order: 104 },
  ];

  const entityTypes = ['act', 'order', 'letter'];

  for (const typeName of entityTypes) {
    const { rows } = await pool.query(
      `SELECT id FROM entity_types WHERE name = $1`,
      [typeName]
    );
    if (!rows.length) continue;
    const typeId = rows[0].id;

    for (const f of subjectFields) {
      await pool.query(`
        INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, sort_order)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (entity_type_id, name) DO NOTHING
      `, [typeId, f.name, f.name_ru, f.field_type, f.sort_order]);
    }
  }

  console.log('037_subject_fields: added subject fields to act, order, letter');
};
