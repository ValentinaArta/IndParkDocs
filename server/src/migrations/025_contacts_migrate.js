const logger = require('../logger');

module.exports = async function runMigration025(pool) {
  try {
    // Найти компании со старыми полями contact_person / phone / email,
    // у которых поле contacts ещё не заполнено
    const { rows } = await pool.query(`
      SELECT e.id, e.properties
      FROM entities e
      JOIN entity_types et ON et.id = e.entity_type_id AND et.name = 'company'
      WHERE deleted_at IS NULL
        AND (
          e.properties->>'contact_person' IS NOT NULL AND e.properties->>'contact_person' != ''
          OR e.properties->>'phone' IS NOT NULL AND e.properties->>'phone' != ''
          OR e.properties->>'email' IS NOT NULL AND e.properties->>'email' != ''
        )
        AND (
          e.properties->>'contacts' IS NULL
          OR e.properties->>'contacts' = ''
          OR e.properties->>'contacts' = '[]'
        )
    `);

    let migrated = 0;
    for (const row of rows) {
      const p = row.properties || {};
      const contact = {};
      if (p.contact_person) contact.name     = p.contact_person;
      if (p.phone)          contact.phone    = p.phone;
      if (p.email)          contact.email    = p.email;
      if (Object.keys(contact).length === 0) continue;

      await pool.query(
        `UPDATE entities
         SET properties = properties || jsonb_build_object('contacts', $1::jsonb)
         WHERE id = $2`,
        [JSON.stringify([contact]), row.id]
      );
      migrated++;
    }

    // Сделать поле contacts видимым (sort_order 45, если оно было ≥ 999)
    await pool.query(`
      UPDATE field_definitions
      SET sort_order = 45
      WHERE name = 'contacts'
        AND sort_order >= 999
    `);

    logger.info(`runMigration025: migrated ${migrated} company contacts, field now visible`);
  } catch(e) {
    logger.error('runMigration025 error (non-fatal):', e.message);
  }
};
