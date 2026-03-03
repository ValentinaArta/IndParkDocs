# Frontend Structure (после рефакторинга 2026-03-03)

## Важно: старые монолиты — пустые stubs!
- `entity-crud.js` — 3 строки (пустой, НЕ редактировать)
- `entity-form.js` — пустой stub
- `reports.js` — пустой stub

## Структура модулей (`server/src/frontend/`)

### Порядок загрузки в index.js (критично!)
```
1. core/utils.js      escapeHtml, _fmtNum, _fmtDate — БЕЗ зависимостей
2. core.js            icon(), API, TOKEN, CONTRACT_TYPE_FIELDS
3. core/api.js        api() — зависит от TOKEN, API из core.js
4. core/globals.js    ENTITY_TYPE_ICONS, entityIcon()
5. searchable-select.js
6. components/*       amount-input, advances, contacts, duration, act-items, contract-items
7. forms/*            field-input, equipment-form, land-plot-quick, contract-form
8. entity-form.js     (пустой stub)
9. modal.js
10. pages/*           nav, totp, legal-zachety, dashboard, finance-page, budget-page, map-page
11. rent-objects.js
12. entity-crud.js    (пустой stub)
13. supplements.js
14. land-plot-parts.js
15. acts.js
16. reports/*         aggregate, pivot, linked-report, rent-analysis, work-history
17. reports.js        (пустой stub)
18. relations.js
19. settings.js
20. ai-chat.js
```

## Где что лежит

| Функция | Файл |
|---------|------|
| escapeHtml, _fmtNum, _fmtDate | `core/utils.js` |
| api() | `core/api.js` |
| ENTITY_TYPE_ICONS, entityIcon | `core/globals.js` |
| CONTRACT_TYPE_FIELDS, icon(), TOKEN, API | `core.js` |
| renderSearchableSelect, _srchFilter | `searchable-select.js` |
| parseAmount, formatAmountDisplay | `components/amount-input.js` |
| renderAdvancesBlock | `components/advances.js` |
| _renderContactsList, _collectContacts | `components/contacts.js` |
| renderDurationSection | `components/duration.js` |
| renderActItemsField, actItemAdd | `components/act-items.js` |
| renderContractItemsField | `components/contract-items.js` |
| renderFieldInput, getFieldValue | `forms/field-input.js` |
| renderEquipmentListField | `forms/equipment-form.js` |
| quickCreateLandPlot | `forms/land-plot-quick.js` |
| renderContractFormFields, recalcRentMonthly | `forms/contract-form.js` |
| showLoadingModal, setModalContent, closeModal | `modal.js` |
| setActiveNav, doLogin, logout, init | `pages/nav.js` |
| showTotpSetup, verifyTotp | `pages/totp.js` |
| showLegalZachety, saveZachet | `pages/legal-zachety.js` |
| showDashboard, loadAreaPieChart | `pages/dashboard.js` |
| showFinancePage | `pages/finance-page.js` |
| showBudgetPage, showBIPage | `pages/budget-page.js` |
| showMapPage | `pages/map-page.js` |
| addRentObject, renderRentFields | `rent-objects.js` |
| showEntityList, renderEntityGrid | `entities/entity-list.js` |
| showEntity | `entities/entity-detail.js` |
| openCreateModal, _doSubmitCreate | `entities/entity-create.js` |
| openEditModal, _doSubmitEdit | `entities/entity-edit.js` |
| deleteEntity | `entities/entity-delete.js` |
| renderContractCard, openContractCard | `entities/contract-card.js` |
| renderSupplementCard | `entities/supplement-card.js` |
| collectEntityIds, onEntitySelectChange | `entities/entity-helpers.js` |
| _ownCompanies, _rooms, loadEntityLists | `entities/data.js` |
| buildAggregateReport, showReports | `reports/aggregate.js` |
| buildPivotTable, showPivotCellDetail | `reports/pivot.js` |
| runLinkedReport, runReport | `reports/linked-report.js` |
| buildRentAnalysis | `reports/rent-analysis.js` |
| showWorkHistory | `reports/work-history.js` |

## Правило добавления новых функций

1. Определи к какому модулю относится функция
2. Добавь в соответствующий файл (НЕ в entity-crud.js!)
3. Если создаёшь новый файл — добавь require() в index.js в правильном месте
4. Проверь: `node --check` + `npm test`

## Формат каждого модуля
```js
/* eslint-disable */
module.exports = `
// === SECTION NAME ===

function myFunction() {
  // ...
}
`;
```

**Внимание**: если внутри JS-кода есть backtick-строки (\`...\`),
используй array join вместо template literal для module.exports.
