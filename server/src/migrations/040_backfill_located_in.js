/**
 * 040_backfill_located_in
 * Для старых договоров аренды/субаренды, у которых rent_objects содержит
 * room_id или land_plot_part_id / land_plot_id, но нет located_in relations —
 * создаём недостающие связи.
 */
module.exports = async function migration040(pool) {
  // Все договоры аренды/субаренды с rent_objects
  const { rows: contracts } = await pool.query(`
    SELECT e.id, e.properties->>'rent_objects' as rent_objects_raw
    FROM entities e
    JOIN entity_types et ON et.id = e.entity_type_id AND et.name = 'contract'
    WHERE e.deleted_at IS NULL
      AND e.properties->>'contract_type' IN ('Аренды','Субаренды','Аренда оборудования')
      AND e.properties->'rent_objects' IS NOT NULL
  `);

  let created = 0;
  for (const contract of contracts) {
    let items = [];
    try { items = JSON.parse(contract.rent_objects_raw || '[]'); } catch (_) { continue; }

    for (const item of items) {
      // Кандидаты на linked entity
      const candidates = [
        item.land_plot_part_id ? parseInt(item.land_plot_part_id) : null,
        item.land_plot_id      ? parseInt(item.land_plot_id)      : null,
        item.room_id           ? parseInt(item.room_id)           : null,
      ].filter(Boolean);

      for (const entityId of candidates) {
        // Проверяем что entity существует
        const { rows: exists } = await pool.query(
          'SELECT id FROM entities WHERE id=$1 AND deleted_at IS NULL', [entityId]
        );
        if (!exists.length) continue;

        // Проверяем нет ли уже такой связи
        const { rows: dup } = await pool.query(
          `SELECT 1 FROM relations
           WHERE from_entity_id=$1 AND to_entity_id=$2
             AND relation_type='located_in' AND deleted_at IS NULL`,
          [contract.id, entityId]
        );
        if (dup.length) continue;

        await pool.query(
          `INSERT INTO relations (from_entity_id, to_entity_id, relation_type)
           VALUES ($1, $2, 'located_in') ON CONFLICT DO NOTHING`,
          [contract.id, entityId]
        );
        created++;
      }
    }
  }

  if (created > 0) {
    console.log(`040_backfill_located_in: created ${created} located_in relations`);
  }
};
