const logger = require('../logger');

module.exports = async function runMigration034(pool) {
  try {
    // 1. Create letter_topics reference table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS letter_topics (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed initial topics
    await pool.query(`
      INSERT INTO letter_topics (name, sort_order) VALUES
        ('Пожарка', 1),
        ('Прочее', 100)
      ON CONFLICT (name) DO NOTHING
    `);

    // 2. Create letter entity type
    const typeRes = await pool.query(`
      INSERT INTO entity_types (name, name_ru, icon, color, sort_order)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (name) DO UPDATE
        SET name_ru=EXCLUDED.name_ru, icon=EXCLUDED.icon, color=EXCLUDED.color, sort_order=EXCLUDED.sort_order
      RETURNING id
    `, ['letter', 'Письмо', '✉️', '#6366F1', 13]);

    if (!typeRes.rows.length) return; // mocked DB in tests
    const typeId = typeRes.rows[0].id;

    const fields = [
      { name: 'from_company_id',   name_ru: 'От кого (ID)',       field_type: 'hidden',   options: null },
      { name: 'from_company_name', name_ru: 'От кого',            field_type: 'text',     options: null },
      { name: 'to_company_id',     name_ru: 'Кому (ID)',          field_type: 'hidden',   options: null },
      { name: 'to_company_name',   name_ru: 'Кому',              field_type: 'text',     options: null },
      { name: 'outgoing_number',   name_ru: 'Исх. №',            field_type: 'text',     options: null },
      { name: 'letter_date',       name_ru: 'Дата',              field_type: 'date',     options: null },
      { name: 'topic_id',          name_ru: 'Тема (ID)',          field_type: 'hidden',   options: null },
      { name: 'topic_name',        name_ru: 'Тема письма',       field_type: 'text',     options: null },
      { name: 'description',       name_ru: 'Суть письма',       field_type: 'textarea', options: null },
      { name: 'deadline',          name_ru: 'Срок',              field_type: 'date',     options: null },
      { name: 'linked_entities',   name_ru: 'Связанные объекты', field_type: 'json',     options: null },
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

    logger.info('Migration 034 applied: letter entity type + letter_topics table');
  } catch (e) {
    logger.error({ msg: 'Migration 034 error', err: e.message });
    throw e;
  }
};
