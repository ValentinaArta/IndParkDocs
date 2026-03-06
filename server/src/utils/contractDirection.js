/**
 * contractDirection.js
 * Утилиты для определения направления договора (доход/расход) и ВГО.
 */

/** Роли, означающие что нам платят (доход) */
const INCOME_ROLES = new Set([
  'арендодатель', 'исполнитель', 'продавец', 'подрядчик',
  'поставщик', 'цедент', 'займодавец',
]);

/**
 * Определяет направление договора на основе роли нашей стороны.
 * @param {string} ourRoleLabel - значение поля our_role_label
 * @returns {'income'|'expense'|'unknown'}
 */
function getContractDirection(ourRoleLabel) {
  if (!ourRoleLabel) return 'unknown';
  const role = ourRoleLabel.toLowerCase().trim();
  if (INCOME_ROLES.has(role)) return 'income';
  return 'expense';
}

/**
 * Проверяет, является ли договор внутригрупповым (ВГО).
 * Договор ВГО, если ВСЕ стороны (contractor_id, subtenant_id и т.д.)
 * являются нашими компаниями. Пустые/отсутствующие поля игнорируются.
 *
 * @param {Object} props - свойства договора (properties из БД)
 * @param {Set<number>} ownCompanyIds - множество id наших компаний
 * @returns {boolean}
 */
function isAllPartiesInternal(props, ownCompanyIds) {
  if (!props || !ownCompanyIds) return false;
  // Собираем все ID сторон договора (кроме нашего юрлица — оно всегда наше)
  const partyIds = ['contractor_id', 'subtenant_id']
    .map(f => parseInt(props[f]))
    .filter(n => n && !isNaN(n));
  if (!partyIds.length) return false;
  return partyIds.every(id => ownCompanyIds.has(id));
}

/**
 * Загружает Set id наших компаний из БД.
 * @param {Pool} pool
 * @returns {Promise<Set<number>>}
 */
async function loadOwnCompanyIds(pool) {
  const { rows } = await pool.query(`
    SELECT e.id FROM entities e
    JOIN entity_types et ON e.entity_type_id = et.id AND et.name = 'company'
    WHERE e.properties->>'is_own' = 'true' AND e.deleted_at IS NULL
  `);
  return new Set(rows.map(r => r.id));
}

/**
 * Вычисляет и сохраняет is_vgo в properties договора.
 * @param {number} entityId
 * @param {Object} props
 * @param {Pool} pool
 * @returns {Promise<boolean>}
 */
async function computeAndSaveVgo(entityId, props, pool) {
  const ownIds = await loadOwnCompanyIds(pool);
  const isVgo = isAllPartiesInternal(props, ownIds);
  await pool.query(
    `UPDATE entities SET properties = properties || jsonb_build_object('is_vgo', $1::boolean) WHERE id = $2`,
    [isVgo, entityId]
  );
  return isVgo;
}

/** @deprecated Используй isAllPartiesInternal */
function isInternalContract(contractorId, ownCompanyIds) {
  if (!contractorId || !ownCompanyIds) return false;
  return ownCompanyIds.has(parseInt(contractorId));
}

module.exports = { getContractDirection, isInternalContract, isAllPartiesInternal, loadOwnCompanyIds, computeAndSaveVgo };
