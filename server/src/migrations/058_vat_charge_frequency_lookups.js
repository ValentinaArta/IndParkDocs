/**
 * Migration 058: Convert vat_rate from number to select, add charge_type and frequency lookups
 * All managed via field_option_values → editable in Settings > Справочники
 */
module.exports = async function(pool) {
  // 1. Change vat_rate from number to select for contract (id=8764) and supplement (id=8765)
  await pool.query(`
    UPDATE field_definitions SET field_type = 'select'
    WHERE id IN (8764, 8765) AND name = 'vat_rate'
  `);

  // 2. Insert vat_rate options (for both field_definitions)
  const vatOptions = ['22', '20', '10', '0'];
  for (const fdId of [8764, 8765]) {
    for (let i = 0; i < vatOptions.length; i++) {
      await pool.query(
        `INSERT INTO field_option_values (field_definition_id, value, sort_order)
         VALUES ($1, $2, $3) ON CONFLICT (field_definition_id, value) DO NOTHING`,
        [fdId, vatOptions[i], i]
      );
    }
  }

  // 3. Create charge_type field_definition for contract (entity_type_id=5)
  const { rows: [ctFd] } = await pool.query(
    `INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, sort_order)
     VALUES (5, 'charge_type', 'Тип начисления', 'select', 900)
     ON CONFLICT DO NOTHING RETURNING id`
  );
  if (ctFd) {
    const chargeTypes = ['Повторяющийся', 'Разовый', 'Доп. услуги'];
    for (let i = 0; i < chargeTypes.length; i++) {
      await pool.query(
        `INSERT INTO field_option_values (field_definition_id, value, sort_order)
         VALUES ($1, $2, $3) ON CONFLICT (field_definition_id, value) DO NOTHING`,
        [ctFd.id, chargeTypes[i], i]
      );
    }
  }

  // 4. Create frequency field_definition for contract (entity_type_id=5)
  const { rows: [frFd] } = await pool.query(
    `INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, sort_order)
     VALUES (5, 'frequency', 'Периодичность оплаты', 'select', 901)
     ON CONFLICT DO NOTHING RETURNING id`
  );
  if (frFd) {
    const frequencies = ['Ежемесячно', 'Ежеквартально', 'Раз в полгода', 'Ежегодно'];
    for (let i = 0; i < frequencies.length; i++) {
      await pool.query(
        `INSERT INTO field_option_values (field_definition_id, value, sort_order)
         VALUES ($1, $2, $3) ON CONFLICT (field_definition_id, value) DO NOTHING`,
        [frFd.id, frequencies[i], i]
      );
    }
  }
};
