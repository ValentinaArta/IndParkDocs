require('dotenv').config({ path: __dirname + '/../.env' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });

const TYPES = [
  { name: 'building', name_ru: 'Корпус', icon: '🏢', color: '#6366F1', sort_order: 1 },
  { name: 'workshop', name_ru: 'Цех', icon: '🏭', color: '#8B5CF6', sort_order: 2 },
  { name: 'room', name_ru: 'Помещение', icon: '🚪', color: '#A78BFA', sort_order: 3 },
  { name: 'company', name_ru: 'Компания', icon: '🏛', color: '#3B82F6', sort_order: 4 },
  { name: 'contract', name_ru: 'Договор', icon: '📄', color: '#EF4444', sort_order: 5 },
  { name: 'equipment', name_ru: 'Оборудование', icon: '⚙️', color: '#F59E0B', sort_order: 6 },
  { name: 'document', name_ru: 'Документ', icon: '📋', color: '#10B981', sort_order: 7 },
  { name: 'crane_track', name_ru: 'Подкрановый путь', icon: '🛤', color: '#F97316', sort_order: 8 },
  { name: 'supplement', name_ru: 'Доп. соглашение', icon: '📎', color: '#8B5CF6', sort_order: 9 },
];

const FIELDS = {
  building: [
    { name: 'address', name_ru: 'Адрес', field_type: 'text' },
    { name: 'total_area', name_ru: 'Общая площадь (м²)', field_type: 'number' },
  ],
  workshop: [
    { name: 'area', name_ru: 'Площадь (м²)', field_type: 'number' },
    { name: 'purpose', name_ru: 'Назначение', field_type: 'text' },
  ],
  room: [
    { name: 'area', name_ru: 'Площадь (м²)', field_type: 'number' },
    { name: 'floor', name_ru: 'Этаж', field_type: 'text' },
    { name: 'room_number', name_ru: 'Номер помещения', field_type: 'text' },
  ],
  company: [
    { name: 'inn', name_ru: 'ИНН', field_type: 'text' },
    { name: 'contact_person', name_ru: 'Контактное лицо', field_type: 'text' },
    { name: 'phone', name_ru: 'Телефон', field_type: 'text' },
    { name: 'email', name_ru: 'Email', field_type: 'text' },
  ],
  contract: [
    { name: 'our_legal_entity', name_ru: 'Наше юр. лицо', field_type: 'select_or_custom', options: JSON.stringify([]) },
    { name: 'contract_type', name_ru: 'Тип договора', field_type: 'select_or_custom', options: JSON.stringify(['Подряда','Аренды','Услуг','Поставки','Эксплуатации','Купли-продажи','Цессии']) },
    { name: 'contractor_name', name_ru: 'Наименование контрагента', field_type: 'select_or_custom', options: JSON.stringify([]) },
    { name: 'number', name_ru: '№ договора', field_type: 'text', required: true },
    { name: 'contract_date', name_ru: 'Дата договора', field_type: 'date' },
  ],
  supplement: [
    { name: 'our_legal_entity', name_ru: 'Наше юр. лицо', field_type: 'select_or_custom', options: JSON.stringify([]) },
    { name: 'contract_type', name_ru: 'Тип договора', field_type: 'select_or_custom', options: JSON.stringify(['Подряда','Аренды','Услуг','Поставки','Эксплуатации','Купли-продажи','Цессии']) },
    { name: 'contractor_name', name_ru: 'Наименование контрагента', field_type: 'select_or_custom', options: JSON.stringify([]) },
    { name: 'number', name_ru: '№ доп. соглашения', field_type: 'text', required: true },
    { name: 'contract_date', name_ru: 'Дата доп. соглашения', field_type: 'date' },
    { name: 'changes_description', name_ru: 'Что поменялось', field_type: 'text' },
  ],
  equipment: [
    { name: 'inv_number', name_ru: 'Инв. номер', field_type: 'text' },
    { name: 'equipment_type', name_ru: 'Тип', field_type: 'text' },
    { name: 'capacity', name_ru: 'Грузоподъёмность', field_type: 'text' },
    { name: 'status', name_ru: 'Статус', field_type: 'select', options: JSON.stringify(['В работе','Законсервирован','На ремонте','Списан']) },
  ],
  document: [
    { name: 'doc_number', name_ru: 'Номер документа', field_type: 'text' },
    { name: 'doc_type', name_ru: 'Тип документа', field_type: 'select', options: JSON.stringify(['Приказ','Акт','Доп.соглашение','Протокол','Справка','Прочее']) },
    { name: 'doc_date', name_ru: 'Дата', field_type: 'date' },
  ],
  crane_track: [
    { name: 'length', name_ru: 'Длина (м)', field_type: 'number' },
    { name: 'location', name_ru: 'Расположение', field_type: 'text' },
  ],
};

const RELATION_TYPES = [
  { name: 'located_in', name_ru: 'расположен в', color: '#6366F1' },
  { name: 'rents', name_ru: 'арендует', color: '#EF4444' },
  { name: 'services', name_ru: 'обслуживает', color: '#F59E0B' },
  { name: 'party_to', name_ru: 'сторона договора', color: '#3B82F6' },
  { name: 'subject_of', name_ru: 'предмет договора', color: '#10B981' },
  { name: 'supplement_to', name_ru: 'дополнение к', color: '#8B5CF6' },
  { name: 'act_for', name_ru: 'акт по', color: '#EC4899' },
  { name: 'installed_on', name_ru: 'установлен на', color: '#F97316' },
];

async function seed() {
  const client = await pool.connect();
  try {
    // Insert entity types
    for (const t of TYPES) {
      const res = await client.query(
        `INSERT INTO entity_types (name, name_ru, icon, color, sort_order) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (name) DO UPDATE SET name_ru=$2, icon=$3, color=$4, sort_order=$5 RETURNING id`,
        [t.name, t.name_ru, t.icon, t.color, t.sort_order]
      );
      const typeId = res.rows[0].id;

      // Insert fields for this type
      const fields = FIELDS[t.name] || [];
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        await client.query(
          `INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, options, required, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (entity_type_id, name) DO UPDATE SET name_ru=$3, field_type=$4, options=$5, required=$6, sort_order=$7`,
          [typeId, f.name, f.name_ru, f.field_type, f.options || null, f.required || false, i]
        );
      }
    }

    // Insert relation types
    for (const r of RELATION_TYPES) {
      await client.query(
        `INSERT INTO relation_types (name, name_ru, color) VALUES ($1,$2,$3) ON CONFLICT (name) DO UPDATE SET name_ru=$2, color=$3`,
        [r.name, r.name_ru, r.color]
      );
    }

    console.log('Seed complete');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(e => { console.error(e); process.exit(1); });
