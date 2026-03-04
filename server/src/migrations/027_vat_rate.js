const logger = require('../logger');

module.exports = async function runMigration027(pool) {
  try {
    // Add vat_rate (НДС %) to contract and supplement field_definitions.
    // Shown for all types EXCEPT Аренды/Субаренды/Аренда оборудования
    // (those render it inside their own rent section with VAT calculation).
    // Default value 22 is applied in contract-form.js renderContractFormFields().
    for (const typeName of ['contract', 'supplement']) {
      const res = await pool.query('SELECT id FROM entity_types WHERE name = $1', [typeName]);
      if (!res.rows.length) continue;
      const tid = res.rows[0].id;
      await pool.query(`
        INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, sort_order)
        VALUES ($1, 'vat_rate', 'НДС (%)', 'number', 9)
        ON CONFLICT (entity_type_id, name) DO UPDATE
          SET name_ru = 'НДС (%)', sort_order = 9
      `, [tid]);
    }
    logger.info('Migration 027 applied: vat_rate added to contract + supplement field_definitions');
  } catch (e) {
    logger.error({ msg: 'Migration 027 error', err: e.message });
    throw e;
  }
};
