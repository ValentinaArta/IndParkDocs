// 036_recompute_vgo2.js
// Пересчитывает is_vgo для всех существующих договоров с исправленной логикой.
//
// Правильная логика ВГО:
//   - Обычный (2 стороны): our_legal_entity_id + contractor_id — обе наши компании
//   - Субаренда (3 стороны): our_legal_entity_id + contractor_id + subtenant_id — все три наши

module.exports = async function(pool) {
  const { rows: ownRows } = await pool.query(`
    SELECT e.id FROM entities e
    JOIN entity_types et ON e.entity_type_id = et.id AND et.name = 'company'
    WHERE e.properties->>'is_own' = 'true' AND e.deleted_at IS NULL
  `);
  const ownIds = new Set(ownRows.map(r => r.id));

  const { rows: contracts } = await pool.query(`
    SELECT e.id, e.properties
    FROM entities e
    JOIN entity_types et ON e.entity_type_id = et.id AND et.name = 'contract'
    WHERE e.deleted_at IS NULL
  `);

  let updated = 0;
  for (const c of contracts) {
    const props = c.properties || {};

    const ourId = parseInt(props['our_legal_entity_id']);
    const contractorId = parseInt(props['contractor_id']);

    // Обе основные стороны обязаны быть заданы и быть нашими
    let isVgo = false;
    if (ourId && !isNaN(ourId) && contractorId && !isNaN(contractorId)) {
      if (ownIds.has(ourId) && ownIds.has(contractorId)) {
        // Субаренда: проверяем субарендатора
        const subtenantId = parseInt(props['subtenant_id']);
        if (subtenantId && !isNaN(subtenantId)) {
          isVgo = ownIds.has(subtenantId);
        } else {
          isVgo = true;
        }
      }
    }

    await pool.query(
      `UPDATE entities SET properties = properties || jsonb_build_object('is_vgo', $1::boolean) WHERE id = $2`,
      [isVgo, c.id]
    );
    updated++;
  }

  console.log(`036_recompute_vgo2: updated ${updated} contracts`);
};
