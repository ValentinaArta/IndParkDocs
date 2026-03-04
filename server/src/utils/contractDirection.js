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
 * @param {number|string} contractorId - id контрагента
 * @param {Set<number>} ownCompanyIds - множество id наших компаний
 * @returns {boolean}
 */
function isInternalContract(contractorId, ownCompanyIds) {
  if (!contractorId || !ownCompanyIds) return false;
  return ownCompanyIds.has(parseInt(contractorId));
}

module.exports = { getContractDirection, isInternalContract };
