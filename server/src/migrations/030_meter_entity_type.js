const logger = require('../logger');

module.exports = async function runMigration030(pool) {
  try {
    // Upsert meter entity type
    const typeRes = await pool.query(`
      INSERT INTO entity_types (name, name_ru, icon, color, sort_order)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (name) DO UPDATE
        SET name_ru=EXCLUDED.name_ru, icon=EXCLUDED.icon, color=EXCLUDED.color, sort_order=EXCLUDED.sort_order
      RETURNING id
    `, ['meter', 'Счётчик', '🔢', '#0EA5E9', 12]);

    if (!typeRes.rows.length) return; // mocked DB in tests — skip field insertion
    const typeId = typeRes.rows[0].id;

    const fields = [
      { name: 'meter_type',              name_ru: 'Тип',                                    field_type: 'select', options: JSON.stringify(['Электричество','Вода','Тепло','Газ']) },
      { name: 'installation_location',   name_ru: 'Место установки',                        field_type: 'text',   options: null },
      { name: 'meter_number',            name_ru: '№ счётчика',                             field_type: 'text',   options: null },
      { name: 'type_and_brand',          name_ru: 'Тип и марка',                            field_type: 'text',   options: null },
      { name: 'manufacture_date',        name_ru: 'Дата выпуска',                           field_type: 'text',   options: null },
      { name: 'tn_tt_ratio',             name_ru: 'Коэфф. тн/тт (эл.)',                    field_type: 'text',   options: null },
      { name: 'limit_current',           name_ru: 'Огранич.ток (эл.)',                      field_type: 'text',   options: null },
      { name: 'connected_to',            name_ru: 'Подключен к (эл.)',                      field_type: 'text',   options: null },
      { name: 'mean_time_to_failure',    name_ru: 'Средняя наработка до отказа',            field_type: 'text',   options: null },
      { name: 'service_life',            name_ru: 'Средний срок службы',                   field_type: 'text',   options: null },
      { name: 'warranty_from_sale',      name_ru: 'Гарантийный срок со дня продажи/ввода', field_type: 'text',   options: null },
      { name: 'warranty_from_manufacture', name_ru: 'Гарантийный срок с даты выпуска',     field_type: 'text',   options: null },
      { name: 'verification_interval',   name_ru: 'Межповерочный интервал (лет)',           field_type: 'number', options: null },
      { name: 'verification_date',       name_ru: 'Дата выдачи свидетельства поверки',      field_type: 'date',   options: null },
      { name: 'next_verification_date',  name_ru: 'Срок следующей поверки',                 field_type: 'date',   options: null },
    ];

    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      await pool.query(`
        INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, options, required, sort_order)
        VALUES ($1,$2,$3,$4,$5,false,$6)
        ON CONFLICT (entity_type_id, name) DO UPDATE
          SET name_ru=EXCLUDED.name_ru, field_type=EXCLUDED.field_type, options=EXCLUDED.options, sort_order=EXCLUDED.sort_order
      `, [typeId, f.name, f.name_ru, f.field_type, f.options, i + 1]);
    }

    logger.info('Migration 030 applied: meter entity type with 15 fields');
  } catch (e) {
    logger.error({ msg: 'Migration 030 error', err: e.message });
    throw e;
  }
};
