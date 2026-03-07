/**
 * 039_perf_indexes
 * Добавляет btree-индексы на часто используемые поля properties:
 * - contract_type — фильтры в отчётах и реестре
 * - contractor_id — поиск договоров контрагента
 * - our_legal_entity_id — поиск по нашему юрлицу
 * - doc_status — фильтр по статусу
 */
module.exports = async function migration039(pool) {
  await pool.query(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_contract_type
      ON entities ((properties->>'contract_type'))
      WHERE deleted_at IS NULL;
  `);
  await pool.query(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_contractor_id
      ON entities ((properties->>'contractor_id'))
      WHERE deleted_at IS NULL;
  `);
  await pool.query(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_our_legal_entity_id
      ON entities ((properties->>'our_legal_entity_id'))
      WHERE deleted_at IS NULL;
  `);
  await pool.query(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_doc_status
      ON entities ((properties->>'doc_status'))
      WHERE deleted_at IS NULL;
  `);
};
