// 035_recompute_vgo.js
// Пересчитывает is_vgo для всех существующих договоров.
// ВГО = ВСЕ стороны договора (contractor_id, subtenant_id) — наши компании.

module.exports = async function(pool) {
  // Загружаем IDs наших компаний
  const { rows: ownRows } = await pool.query(`
    SELECT e.id FROM entities e
    JOIN entity_types et ON e.entity_type_id = et.id AND et.name = 'company'
    WHERE e.properties->>'is_own' = 'true' AND e.deleted_at IS NULL
  `);
  const ownIds = new Set(ownRows.map(r => r.id));

  // Загружаем все договоры
  const { rows: contracts } = await pool.query(`
    SELECT e.id, e.properties
    FROM entities e
    JOIN entity_types et ON e.entity_type_id = et.id AND et.name = 'contract'
    WHERE e.deleted_at IS NULL
  `);

  let updated = 0;
  for (const c of contracts) {
    const props = c.properties || {};
    const partyIds = ['contractor_id', 'subtenant_id']
      .map(f => parseInt(props[f]))
      .filter(n => n && !isNaN(n));

    const isVgo = partyIds.length > 0 && partyIds.every(id => ownIds.has(id));

    await pool.query(
      `UPDATE entities SET properties = properties || jsonb_build_object('is_vgo', $1::boolean) WHERE id = $2`,
      [isVgo, c.id]
    );
    updated++;
  }

  console.log(`035_recompute_vgo: updated ${updated} contracts`);
};
