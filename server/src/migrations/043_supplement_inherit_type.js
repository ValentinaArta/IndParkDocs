/**
 * 043_supplement_inherit_type
 *
 * Убирает поле contract_type из типа "supplement":
 *   - удаляет field_option_values для этого поля (cascade)
 *   - удаляет field_definition id=35 (supplement → contract_type)
 *
 * Тип ДС теперь всегда наследуется от родительского договора через API.
 * Данные в properties существующих ДС не трогаем (нейтральный остаток).
 */
module.exports = async function migration043(pool) {
  // Найти field_definition contract_type для supplement
  const { rows } = await pool.query(`
    SELECT fd.id FROM field_definitions fd
    JOIN entity_types et ON et.id = fd.entity_type_id AND et.name = 'supplement'
    WHERE fd.name = 'contract_type'
  `);
  if (!rows.length) { console.log('043: supplement contract_type field not found, skip'); return; }

  const fieldId = rows[0].id;
  // field_option_values удалятся каскадно
  await pool.query('DELETE FROM field_definitions WHERE id=$1', [fieldId]);
  console.log(`043: deleted supplement contract_type field_definition id=${fieldId}`);
};
