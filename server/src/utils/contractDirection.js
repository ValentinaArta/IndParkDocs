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
 *
 * Логика:
 *   - Обычный договор (2 стороны): our_legal_entity_id + contractor_id — обе наши
 *   - Субаренда (3 стороны): our_legal_entity_id + contractor_id + subtenant_id — все три наши
 *
 * Если our_legal_entity_id или contractor_id не заданы — договор НЕ ВГО.
 *
 * @param {Object} props - свойства договора (properties из БД)
 * @param {Set<number>} ownCompanyIds - множество id наших компаний
 * @returns {boolean}
 */
function isAllPartiesInternal(props, ownCompanyIds) {
  if (!props || !ownCompanyIds) return false;
  // Обязательные стороны: наш юрлицо + контрагент
  const ourId = parseInt(props['our_legal_entity_id']);
  const contractorId = parseInt(props['contractor_id']);
  if (!ourId || isNaN(ourId) || !contractorId || isNaN(contractorId)) return false;
  if (!ownCompanyIds.has(ourId) || !ownCompanyIds.has(contractorId)) return false;
  // Субаренда: третья сторона тоже обязана быть нашей
  const subtenantId = parseInt(props['subtenant_id']);
  if (subtenantId && !isNaN(subtenantId) && !ownCompanyIds.has(subtenantId)) return false;
  return true;
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
