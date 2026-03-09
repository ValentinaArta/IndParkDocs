const logger = require('../logger');

/*
 * Migration 052: Move CONTRACT_TYPE_FIELDS from frontend hard-code into DB.
 * Table: contract_type_fields
 *   contract_type  — e.g. "Аренды", "Услуг"
 *   field_name     — e.g. "rent_objects", "contract_items"
 *   name_ru        — display label
 *   field_type     — renderer key (text, number, subject_buildings, contract_items …)
 *   options        — JSONB (select values, flags like _readonly)
 *   field_group    — grouping hint (_group in old code)
 *   is_readonly    — boolean
 *   sort_order     — ordering inside the type
 */

const SEED = {
  'Подряда': [
    { name: 'subject', name_ru: 'Предмет договора', field_type: 'text' },
    { name: 'subject_buildings', name_ru: 'Корпуса', field_type: 'subject_buildings' },
    { name: 'subject_rooms', name_ru: 'Помещения', field_type: 'subject_rooms' },
    { name: 'subject_land_plots', name_ru: 'Земельные участки', field_type: 'subject_land_plots' },
    { name: 'subject_land_plot_parts', name_ru: 'Части ЗУ', field_type: 'subject_land_plot_parts' },
    { name: 'equipment_list', name_ru: 'Оборудование', field_type: 'equipment_list' },
    { name: 'contract_items', name_ru: 'Перечень работ', field_type: 'contract_items' },
    { name: 'contract_amount', name_ru: 'Сумма договора', field_type: 'number', _readonly: true },
    { name: 'advances', name_ru: 'Авансы', field_type: 'advances' },
    { name: 'completion_deadline', name_ru: 'Срок выполнения', field_type: 'text' },
  ],
  'Услуг': [
    { name: 'subject', name_ru: 'Предмет договора', field_type: 'text' },
    { name: 'subject_buildings', name_ru: 'Корпуса', field_type: 'subject_buildings' },
    { name: 'subject_rooms', name_ru: 'Помещения', field_type: 'subject_rooms' },
    { name: 'subject_land_plots', name_ru: 'Земельные участки', field_type: 'subject_land_plots' },
    { name: 'subject_land_plot_parts', name_ru: 'Части ЗУ', field_type: 'subject_land_plot_parts' },
    { name: 'equipment_list', name_ru: 'Оборудование', field_type: 'equipment_list' },
    { name: 'contract_items', name_ru: 'Перечень услуг', field_type: 'contract_items' },
    { name: 'contract_amount', name_ru: 'Сумма договора', field_type: 'number', _readonly: true },
    { name: 'payment_frequency', name_ru: 'Периодичность оплаты', field_type: 'select_or_custom', options: ['Единовременно','Ежемесячно','Ежеквартально','Раз в полгода','Ежегодно'] },
    { name: 'advances', name_ru: 'Авансы', field_type: 'advances' },
  ],
  'ТО и ППР': [
    { name: 'subject', name_ru: 'Предмет договора', field_type: 'text' },
    { name: 'subject_buildings', name_ru: 'Корпуса', field_type: 'subject_buildings' },
    { name: 'subject_rooms', name_ru: 'Помещения', field_type: 'subject_rooms' },
    { name: 'subject_land_plots', name_ru: 'Земельные участки', field_type: 'subject_land_plots' },
    { name: 'subject_land_plot_parts', name_ru: 'Части ЗУ', field_type: 'subject_land_plot_parts' },
    { name: 'equipment_list', name_ru: 'Оборудование', field_type: 'equipment_list' },
    { name: 'contract_items', name_ru: 'Перечень работ', field_type: 'contract_items' },
    { name: 'contract_amount', name_ru: 'Сумма договора', field_type: 'number', _readonly: true },
    { name: 'payment_frequency', name_ru: 'Периодичность оплаты', field_type: 'select_or_custom', options: ['Единовременно','Ежемесячно','Ежеквартально','Раз в полгода','Ежегодно'] },
    { name: 'advances', name_ru: 'Авансы', field_type: 'advances' },
  ],
  'Купли-продажи': [
    { name: 'subject', name_ru: 'Предмет договора', field_type: 'text' },
    { name: 'subject_buildings', name_ru: 'Корпуса', field_type: 'subject_buildings' },
    { name: 'subject_rooms', name_ru: 'Помещения', field_type: 'subject_rooms' },
    { name: 'subject_land_plots', name_ru: 'Земельные участки', field_type: 'subject_land_plots' },
    { name: 'subject_land_plot_parts', name_ru: 'Части ЗУ', field_type: 'subject_land_plot_parts' },
    { name: 'equipment_list', name_ru: 'Оборудование', field_type: 'equipment_list' },
    { name: 'contract_items', name_ru: 'Перечень товаров', field_type: 'contract_items_sale' },
    { name: 'contract_amount', name_ru: 'Сумма договора', field_type: 'number', _readonly: true },
  ],
  'Эксплуатации': [
    { name: 'subject', name_ru: 'Предмет договора', field_type: 'text' },
    { name: 'subject_buildings', name_ru: 'Корпуса', field_type: 'subject_buildings' },
    { name: 'subject_rooms', name_ru: 'Помещения', field_type: 'subject_rooms' },
    { name: 'subject_land_plots', name_ru: 'Земельные участки', field_type: 'subject_land_plots' },
    { name: 'subject_land_plot_parts', name_ru: 'Части ЗУ', field_type: 'subject_land_plot_parts' },
    { name: 'equipment_list', name_ru: 'Оборудование', field_type: 'equipment_list' },
    { name: 'contract_items', name_ru: 'Перечень работ/услуг', field_type: 'contract_items' },
    { name: 'contract_amount', name_ru: 'Сумма договора', field_type: 'number', _readonly: true },
    { name: 'payment_frequency', name_ru: 'Периодичность оплаты', field_type: 'select_or_custom', options: ['Единовременно','Ежемесячно','Ежеквартально','Раз в полгода','Ежегодно'] },
  ],
  'Субаренды': [
    { name: 'subject_buildings', name_ru: 'Корпуса', field_type: 'subject_buildings' },
    { name: 'subject_rooms', name_ru: 'Помещения', field_type: 'subject_rooms' },
    { name: 'subject_land_plots', name_ru: 'Земельные участки', field_type: 'subject_land_plots' },
    { name: 'subject_land_plot_parts', name_ru: 'Части ЗУ', field_type: 'subject_land_plot_parts' },
    { name: 'rent_objects', name_ru: 'Объекты', field_type: 'rent_objects' },
    { name: 'rent_monthly', name_ru: 'Арендная плата в месяц', field_type: 'number', _readonly: true, _group: 'all' },
    { name: 'rent_comments', name_ru: 'Комментарии', field_type: 'multi_comments', _group: 'all' },
    { name: 'vat_rate', name_ru: 'НДС (%)', field_type: 'number', _group: 'all' },
    { name: 'external_rental', name_ru: 'Аренда внешняя', field_type: 'checkbox', _group: 'all' },
    { name: 'extra_services', name_ru: 'Доп. услуги', field_type: 'checkbox', _group: 'all' },
    { name: 'extra_services_desc', name_ru: 'Описание доп. услуг', field_type: 'text', _group: 'extra' },
    { name: 'extra_services_cost', name_ru: 'Стоимость в месяц', field_type: 'number', _group: 'extra' },
    { name: 'duration_type', name_ru: 'Срок действия', field_type: 'select', options: ['Дата', 'Текст'], _group: 'all' },
    { name: 'duration_date', name_ru: 'Дата окончания', field_type: 'date', _group: 'duration_date' },
    { name: 'duration_text', name_ru: 'Срок действия (текст)', field_type: 'text', _group: 'duration_text' },
    { name: 'transfer_equipment', name_ru: 'Передача оборудования', field_type: 'checkbox', _group: 'all' },
    { name: 'equipment_list', name_ru: 'Передаваемое оборудование', field_type: 'equipment_list', _group: 'transfer' },
  ],
  'Аренда оборудования': [
    { name: 'subject_buildings', name_ru: 'Корпуса', field_type: 'subject_buildings' },
    { name: 'subject_rooms', name_ru: 'Помещения', field_type: 'subject_rooms' },
    { name: 'subject_land_plots', name_ru: 'Земельные участки', field_type: 'subject_land_plots' },
    { name: 'subject_land_plot_parts', name_ru: 'Части ЗУ', field_type: 'subject_land_plot_parts' },
    { name: 'equipment_list', name_ru: 'Оборудование', field_type: 'equipment_list' },
    { name: 'equipment_rent_items', name_ru: 'Предметы аренды', field_type: 'equipment_rent_items' },
    { name: 'rent_monthly', name_ru: 'Стоимость аренды в месяц', field_type: 'number', _readonly: true, _group: 'all' },
    { name: 'vat_rate', name_ru: 'НДС (%)', field_type: 'number', _group: 'all' },
    { name: 'duration_type', name_ru: 'Срок действия', field_type: 'select', options: ['Дата', 'Текст'], _group: 'all' },
    { name: 'duration_date', name_ru: 'Дата окончания', field_type: 'date', _group: 'duration_date' },
    { name: 'duration_text', name_ru: 'Срок действия (текст)', field_type: 'text', _group: 'duration_text' },
  ],
  'Обслуживания': [
    { name: 'service_subject', name_ru: 'Описание работ / предмет', field_type: 'text' },
    { name: 'subject_buildings', name_ru: 'Корпуса', field_type: 'subject_buildings' },
    { name: 'subject_rooms', name_ru: 'Помещения', field_type: 'subject_rooms' },
    { name: 'subject_land_plots', name_ru: 'Земельные участки', field_type: 'subject_land_plots' },
    { name: 'subject_land_plot_parts', name_ru: 'Части ЗУ', field_type: 'subject_land_plot_parts' },
    { name: 'equipment_list', name_ru: 'Оборудование', field_type: 'equipment_list' },
    { name: 'contract_amount', name_ru: 'Стоимость', field_type: 'number' },
    { name: 'service_comment', name_ru: 'Комментарий', field_type: 'text' },
  ],
  'Аренды': [
    { name: 'subject_buildings', name_ru: 'Корпуса', field_type: 'subject_buildings' },
    { name: 'subject_rooms', name_ru: 'Помещения', field_type: 'subject_rooms' },
    { name: 'subject_land_plots', name_ru: 'Земельные участки', field_type: 'subject_land_plots' },
    { name: 'subject_land_plot_parts', name_ru: 'Части ЗУ', field_type: 'subject_land_plot_parts' },
    { name: 'rent_objects', name_ru: 'Объекты', field_type: 'rent_objects' },
    { name: 'rent_monthly', name_ru: 'Арендная плата в месяц', field_type: 'number', _readonly: true, _group: 'all' },
    { name: 'rent_comments', name_ru: 'Комментарии', field_type: 'multi_comments', _group: 'all' },
    { name: 'vat_rate', name_ru: 'НДС (%)', field_type: 'number', _group: 'all' },
    { name: 'external_rental', name_ru: 'Аренда внешняя', field_type: 'checkbox', _group: 'all' },
    { name: 'extra_services', name_ru: 'Доп. услуги', field_type: 'checkbox', _group: 'all' },
    { name: 'extra_services_desc', name_ru: 'Описание доп. услуг', field_type: 'text', _group: 'extra' },
    { name: 'extra_services_cost', name_ru: 'Стоимость в месяц', field_type: 'number', _group: 'extra' },
    { name: 'duration_type', name_ru: 'Срок действия', field_type: 'select', options: ['Дата', 'Текст'], _group: 'all' },
    { name: 'duration_date', name_ru: 'Дата окончания', field_type: 'date', _group: 'duration_date' },
    { name: 'duration_text', name_ru: 'Срок действия (текст)', field_type: 'text', _group: 'duration_text' },
    { name: 'transfer_equipment', name_ru: 'Передача оборудования', field_type: 'checkbox', _group: 'all' },
    { name: 'equipment_list', name_ru: 'Передаваемое оборудование', field_type: 'equipment_list', _group: 'transfer' },
  ],
};

module.exports = async function runMigration052(pool) {
  try {
    // Create table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contract_type_fields (
        id            SERIAL PRIMARY KEY,
        contract_type VARCHAR(100) NOT NULL,
        field_name    VARCHAR(100) NOT NULL,
        name_ru       VARCHAR(255) NOT NULL,
        field_type    VARCHAR(100) NOT NULL,
        options       JSONB DEFAULT NULL,
        field_group   VARCHAR(50) DEFAULT NULL,
        is_readonly   BOOLEAN DEFAULT FALSE,
        sort_order    INTEGER NOT NULL DEFAULT 0,
        UNIQUE(contract_type, field_name)
      )
    `);

    // Seed data from hard-coded CONTRACT_TYPE_FIELDS
    let total = 0;
    for (const [contractType, fields] of Object.entries(SEED)) {
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        await pool.query(`
          INSERT INTO contract_type_fields (contract_type, field_name, name_ru, field_type, options, field_group, is_readonly, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (contract_type, field_name) DO UPDATE SET
            name_ru = EXCLUDED.name_ru,
            field_type = EXCLUDED.field_type,
            options = EXCLUDED.options,
            field_group = EXCLUDED.field_group,
            is_readonly = EXCLUDED.is_readonly,
            sort_order = EXCLUDED.sort_order
        `, [
          contractType,
          f.name,
          f.name_ru,
          f.field_type,
          f.options ? JSON.stringify(f.options) : null,
          f._group || null,
          !!f._readonly,
          (i + 1) * 10,
        ]);
        total++;
      }
    }

    logger.info(`Migration 052 applied: contract_type_fields table created, ${total} fields seeded`);
  } catch (e) {
    logger.error({ msg: 'Migration 052 error', err: e.message });
    throw e;
  }
};
