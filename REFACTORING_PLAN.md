# План рефакторинга IndParkDocs

Дата: 03.03.2026  
Цель: разбить монолиты на файлы по 100-300 строк, убрать дубли, вынести миграции.

---

## Текущее состояние (проблемы)

| Файл | Строк | Проблема |
|------|-------|---------|
| `frontend/entity-crud.js` | 5161 | Монолит: 162 функции, всё в одном файле |
| `frontend/entity-form.js` | 957 | Смесь: оборудование + акты + контакты + поля |
| `frontend/rent-objects.js` | 981 | Нормально, но есть дублирование |
| `frontend/reports.js` | 706 | Два несвязанных отчёта в одном файле |
| `server/src/index.js` | 1141 | 22 миграции внутри файла запуска сервера |

**Баги:**
- `_fmtNum` определена ДВАЖДЫ в entity-crud.js (строки 1831 и 3670)
- `escapeHtml` в settings.js, `escHtml` в entity-crud.js — одно и то же
- `api()` в entity-crud.js вместо core.js

---

## Целевая структура

```
server/src/
├── index.js                        ~100 строк (только запуск)
├── db.js                           без изменений
├── logger.js                       без изменений
├── migrate.js                      без изменений
│
├── migrations/                     без изменений (001-003)
│   ├── 001_initial.js
│   ├── 002_auth_audit.js
│   ├── 003_contractor_select.js
│   └── 004_..._025_.js             ← НОВЫЕ (вынести из index.js)
│
├── middleware/                     без изменений
├── routes/                         без изменений
│
└── frontend/
    ├── index.js                    ~80 строк (только сборка)
    │
    ├── core/
    │   ├── utils.js                ~80 строк  ← escapeHtml, _fmtNum, _fmtDate, formatAmount
    │   ├── api.js                  ~60 строк  ← api(), fetch обёртка
    │   └── globals.js             ~100 строк  ← CONTRACT_TYPE_FIELDS, ENTITY_TYPE_ICONS, переменные
    │
    ├── css.js                      без изменений
    ├── layout.js                   без изменений
    │
    ├── components/
    │   ├── searchable-select.js    без изменений ✅
    │   ├── amount-input.js         ~60 строк  ← parseAmount, formatAmountDisplay, formatAmountOnBlur
    │   ├── contacts.js             ~60 строк  ← _renderContactBlock, _addContact, _removeContact
    │   ├── duration.js            ~100 строк  ← renderDurationSection, toggleDurationSection
    │   ├── advances.js             ~60 строк  ← renderAdvancesBlock, renderAdvanceRow, addAdvanceRow
    │   └── contract-items.js       ~80 строк  ← renderContractItemsField, contractItemAdd
    │
    ├── forms/
    │   ├── field-input.js         ~150 строк  ← renderFieldInput, enrichFieldOptions, getFieldValue
    │   ├── contract-form.js       ~250 строк  ← renderContractFormFields, onContractTypeChange, collectDynamicFieldValues
    │   └── equipment-form.js      ~200 строк  ← _renderEqListItem, eqListAdd, eqListCreateSubmit
    │
    ├── rent/
    │   ├── rent-objects.js        ~400 строк  ← (текущий rent-objects.js, чуть почищен)
    │   └── acts.js                без изменений ✅
    │
    ├── entities/
    │   ├── entity-list.js         ~200 строк  ← showEntityList, renderEntityGrid, searchEntities
    │   ├── entity-detail.js       ~200 строк  ← showEntity (координатор по типам)
    │   ├── entity-create.js       ~200 строк  ← openCreateModal, _doSubmitCreate
    │   ├── entity-edit.js         ~180 строк  ← openEditModal, _doSubmitEdit
    │   ├── entity-delete.js        ~30 строк  ← deleteEntity
    │   ├── contract-card.js       ~250 строк  ← renderContractCard, openContractCard
    │   ├── supplement-card.js     ~130 строк  ← renderSupplementCard, openSupplementCard
    │   └── entity-helpers.js      ~150 строк  ← collectEntityIds, renderEquipmentLocationFields
    │
    ├── pages/
    │   ├── nav.js                 ~150 строк  ← setActiveNav, init, toggleNavGroup, showLogin, doLogin, logout
    │   ├── dashboard.js           ~200 строк  ← showDashboard, loadAreaPieChart, _renderAreaDashboard
    │   ├── finance-page.js        ~200 строк  ← showFinancePage, _renderFinancePage, _renderExpensesSection
    │   ├── budget-page.js         ~100 строк  ← showBudgetPage, showBIPage
    │   ├── legal-zachety.js       ~250 строк  ← showLegalZachety, loadZachety, saveZachet, addZachet
    │   └── totp.js                ~80 строк   ← showTotpSetup, verifyTotp, disableTotp
    │
    ├── reports/
    │   ├── pivot.js               ~250 строк  ← buildPivotTable, renderAggTree, updatePivotFieldPool
    │   ├── aggregate.js           ~200 строк  ← buildAggregateReport, aggAddField, showReports
    │   ├── rent-analysis.js       ~350 строк  ← (из frontend/reports.js)
    │   └── work-history.js        ~150 строк  ← (из frontend/reports.js)
    │
    ├── modal.js                   ~80 строк   ← showLoadingModal, setModalContent, closeModal, setModalSize
    ├── supplements.js             без изменений ✅
    ├── land-plot-parts.js         без изменений ✅
    ├── relations.js               без изменений ✅
    ├── settings.js                без изменений ✅
    └── ai-chat.js                 без изменений ✅
```

**Итого:** ~35 файлов по 30-400 строк.

---

## Фазы выполнения

### ⚡ Фаза 1 — Баги (1-2 часа, низкий риск)

**Что делаем:**
1. Удалить дублирующуюся `_fmtNum` (строка 1831 в entity-crud.js — короткую версию)
2. Создать `core/utils.js`: перенести `escapeHtml` из settings.js + `escHtml` из entity-crud.js → одна функция `escapeHtml`
3. Создать `core/api.js`: перенести `api()` из entity-crud.js
4. Создать `core/globals.js`: перенести `CONTRACT_TYPE_FIELDS`, `ENTITY_TYPE_ICONS`, глобальные переменные из core.js и entity-crud.js
5. Обновить `index.js` — подключить новые core/ модули **первыми** (до всех остальных)

**Тест:** `npm test` должен пройти, сайт работает.

---

### 📋 Фаза 2 — Компоненты из entity-form.js (2-3 часа, средний риск)

**Что делаем:**
1. `components/amount-input.js` ← `parseAmount`, `formatAmountDisplay`, `formatAmountOnBlur`, `initAmountFormatting`
2. `components/contacts.js` ← `_renderContactsList`, `_renderContactBlock`, `_addContact`, `_removeContact`, `_collectContacts`
3. `components/duration.js` ← `renderDurationSection`, `_renderDurationFields`, `toggleDurationSection`, `onDurationTypeChange`, `clearDurationSection`
4. `components/advances.js` ← `renderAdvancesBlock`, `renderAdvanceRow`, `addAdvanceRow`, `removeAdvanceRow`, `collectAdvances`
5. `components/contract-items.js` ← `renderContractItemsField`, `_renderContractItem`, `contractItemAdd`, `contractItemRemove`, `recalcContractAmount`, `getContractItemsValue`
6. `forms/field-input.js` ← `renderFieldInput`, `enrichFieldOptions`, `getFieldValue`, `getUsedValues`, `toggleCustomInput`, `renderRegistrySelectField`
7. `forms/equipment-form.js` ← `_renderEqListItem`, `renderEquipmentListField`, `eqListAdd`, `eqListRemove`, `eqListCreateShow`, `eqListCreateSubmit`, `getEqListValue`, `onEqCatChange`

После этого `entity-form.js` удаляется — весь его код в модулях.

**Тест:** открыть форму договора, создать новый договор.

---

### 🏗️ Фаза 3 — Страницы из entity-crud.js (3-4 часа, средний риск)

Вырезаем готовые куски из entity-crud.js:

1. `modal.js` ← `showLoadingModal`, `setModalContent`, `setModalSize`, `closeModal`
2. `pages/nav.js` ← `setActiveNav`, `toggleNavGroup`, `_navLoadGroupChildren`, `navSubClick`, `showLogin`, `doLogin`, `logout`, `init`, `startApp`, `entityIcon`
3. `pages/totp.js` ← `showTotpSetup`, `verifyTotp`, `disableTotp`
4. `pages/legal-zachety.js` ← `showLegalZachety`, `loadZachety`, `addZachet`, `addLineRow`, `recalcTotals`, `saveZachet`, `showZachetDetail`, `deleteZachet`, `collectLines`, `suggestContracts`, `showSuggestDropdown`, `removeSuggestDropdown`
5. `pages/dashboard.js` ← `loadAreaPieChart`, `_fmtNum` (одна версия!), `_svgDonut`, `_buildTenantColorMap`, `_renderAreaDashboard`, `_renderSummaryPie`, `_pieDrillClick` и др.
6. `pages/finance-page.js` ← `showFinancePage`, `_finFmt`, `_finCard`, `_renderFinancePage`, `_expFmt`, `switchExpOrg`, `_renderExpensesSection`, `toggleExpense`
7. `pages/budget-page.js` ← `showBudgetPage`, `showBIPage`, `saveBIUrl`, `editBIUrl`

**Тест:** открыть каждую страницу в браузере.

---

### 📊 Фаза 4 — Отчёты (2-3 часа, средний риск)

1. `reports/pivot.js` ← `buildPivotTable`, `updatePivotFieldPool`, `onPivotDragStart`, `onPivotDrop`, `pivotRemoveChip`, `_getPivotVal`, `_isNumericField`, `_fmtNum`, `showPivotCellDetail`
2. `reports/aggregate.js` ← `showReports`, `buildAggregateReport`, `renderAggTree`, `aggAddField`, `aggRemoveField`, `aggMoveField`, `renderAggHierarchyUI`, `aggToggle`, `runLinkedReport`, `runReport`, `onGroupByChange`, `switchReportTab`
3. `reports/rent-analysis.js` ← из текущего `reports.js`
4. `reports/work-history.js` ← из текущего `reports.js`

После этого старый `reports.js` удаляется.

---

### 🔧 Фаза 5 — Entity CRUD (3-4 часа, высокий риск)

Самая сложная часть — много зависимостей:

1. `entities/entity-list.js` ← `showEntityList`, `renderEntityGrid`, `searchEntities`, `showEntityDetail`
2. `entities/entity-detail.js` ← `showEntity` (463 строки → координатор ~50 строк + вызывает специализированные)
3. `entities/entity-create.js` ← `openCreateModal`, `submitCreate`, `_doSubmitCreate`, `renderEquipmentLocationFields`, `onEqLocTypeChange`, `onEqBuildingChange`, `toggleBuildingInlineCreate`, `submitBuildingInline`
4. `entities/entity-edit.js` ← `openEditModal`, `submitEdit`, `_doSubmitEdit`
5. `entities/entity-delete.js` ← `deleteEntity`
6. `entities/contract-card.js` ← `renderContractCard`, `openContractCard`, `_ccFmtDate`, `_ccFmtNum`
7. `entities/supplement-card.js` ← `renderSupplementCard`, `openSupplementCard`
8. `forms/contract-form.js` ← `renderContractFormFields`, `onContractTypeChange`, `updatePartyLabels`, `collectDynamicFieldValues`, `getSelectedContractType`, `recalcRentMonthly`, `onRentFieldChange`

**Тест:** полный цикл создания договора.

---

### 🗃️ Фаза 6 — Миграции из index.js (2-3 часа, низкий риск)

Вынести 22 inline-миграции в отдельные файлы:

```
server/src/migrations/
├── 004_equipment_categories.js
├── 005_room_type.js
├── ...
└── 025_land_plot_parts.js
```

`index.js` становится ~100 строк — только запуск сервера и подключение роутов.

---

## Правила выполнения

1. **Одна фаза = одна feature-ветка** (`feature/refactor-phase-1` и т.д.)
2. После каждой фазы: `npm test` + открыть сайт + проверить ключевые функции
3. Никаких изменений логики — только перемещение кода
4. Если что-то сломалось — откатить фазу, разобраться
5. **Не делать несколько фаз одновременно**

## Метрики успеха

| До | После |
|----|-------|
| entity-crud.js: 5161 строк | ~0 строк (удалён) |
| index.js: 1141 строк | ~100 строк |
| Файлов frontend: 15 | ~35 |
| Макс. строк в файле: 5161 | ~400 |
| Дублирующихся функций: 3 | 0 |
