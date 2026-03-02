# MEMORY.md — Долгосрочная память

## Проект
- **IndParkDocs** — система документов и связей для индустриального парка
- Репо: https://github.com/ValentinaArta/IndParkDocs.git (ветки: main, dev)
- **Продакшн: https://docs.zvezda-park.com** (наш сервер ubuntu-4gb-hel1-2, IP 89.167.75.91)
- Процесс: node на порту 3002, nginx проксирует docs.zvezda-park.com → 127.0.0.1:3002
- Запускается из /root/workspace-indparkdocs (этот workspace!)
- Старый Render: https://indparkdocs.onrender.com (больше не основной)
- Логин: admin / 123456
- Стек: Node.js + Express + PostgreSQL + inline SPA (без сборки)
- **БД: локальная PostgreSQL в Docker** — `postgresql://indpark:indpark2026@127.0.0.1:5432/indparkdocs`
- **Деплой**: код уже в workspace → `systemctl restart indparkdocs` (мгновенно, без ожидания!)
- Systemd service: `/etc/systemd/system/indparkdocs.service`
- Пользователь: `valentina` / `Val2026secure` (admin role)
- Данные перенесены из Neon: 125 сущностей, 169 связей (март 2026)

## Пользователь
- Валентина (ValentinaArta на GitHub)
- Общение на русском
- Не программист — объяснять простым языком
- Любит когда я сам слежу за деплоем и пишу только когда готово

## Ключевые технические решения

### Миграции БД
- НЕ запускать из Procfile (нет DATABASE_URL при старте)
- Встраивать в index.js при старте сервера (runMigration003, runMigration004)
- Всегда использовать ON CONFLICT DO NOTHING / DO UPDATE

### CI
- GitHub Actions: .github/workflows/ci.yml
- npm ci (не npm install) — нужен синхронизированный package-lock.json
- Проверяет синтаксис + frontend JS через new Function()

### Frontend JS
- Вся логика инлайн в frontend.js, отдаётся как HTML (один большой template literal)
- Проверять синтаксис: node -e "new Function('async function __t(){' + m[1] + '}')"
- ОПАСНЫЕ конструкции:
  - `\'string\'` внутри template literal → становится `'string'` и ломает строки в new Function
  - Решение: использовать data-* атрибуты вместо строк в onclick, или &apos;
  - catch {} без параметра

### Git workflow
- feature/task → dev → (PR) → main → автодеплой
- После каждого пуша: мержить оба бранча, ждать деплой, проверять

## Архитектура данных
- Все сущности в таблице entities (contracts, companies, buildings, rooms, equipment...)
- Связи через таблицу relations (party_to, located_in, supplement_to, on_balance)
- Компании: is_own=true → наши юрлица, false → контрагенты (одна таблица)
- Договоры хранят и entity ID (contractor_id) и имя (contractor_name)
- Оборудование: parent_id = иерархия (запчасть→кран→путь), located_in relation = место установки

## Типы сущностей (актуально)
| Тип | Иконка | Назначение |
|-----|--------|-----------|
| building | 🏢 | Корпус |
| workshop | 🏭 | Цех |
| room | 🚪 | Помещение |
| land_plot | 🌍 | Земельный участок |
| company | 🏛 | Компания (is_own=true/false) |
| contract | 📄 | Договор |
| supplement | 📎 | Доп. соглашение |
| equipment | ⚙️ | Оборудование |
| order | 📜 | Приказ |
| document | 📋 | Документ |
| crane_track | 🛤 | Подкрановый путь |
| act | 📝 | Акт выполненных работ (добавлен 2026-02-24) |

## Поля оборудования (после migration 004)
- equipment_category: Электрооборудование / Газовое / Тепловое / Крановое хозяйство / Машины и механизмы / ИК оборудование
- equipment_kind: свободный текст (подстанция, котёл, кран...)
- inv_number, serial_number, year, manufacturer
- status: В работе / На ремонте / Законсервировано / Списано
- balance_owner: entity selector (наши компании, is_own=true) → хранит balance_owner_id + balance_owner_name
- note

## Что реализовано (актуально на 2026-02-23)
- Договоры: создание/редактирование всех типов (Подряд, Аренда, Субаренда, Услуги, Купля-продажа...)
- Доп. соглашения с полем "что поменялось"
- Форма аренды: множественные объекты, авторасчёт аренды, НДС 22%, комментарии
- Entity selectors (наше юрлицо, контрагент, корпус, помещение) — styled как select_or_custom
- Автосоздание relations при сохранении договора (party_to, located_in)
- Иерархия через parent_id, полный хлебный крошки с рекурсивным CTE
- Inline редактор родителя на карточке сущности
- Боковая навигация: Документы + Реестры (все типы сущностей)
- Страница "Отчёты":
  - Вкладка "Сводная таблица" — pivot по любому полю
  - Вкладка "По связям":
    - Оборудование по корпусам (via parent_id OR located_in relation)
    - Оборудование у арендаторов (via party_to → contract → located_in → building → equipment)
- Компании в БД: 6 записей (2 наших + 4 контрагента), привязаны к договорам

## Что реализовано (2026-02-24) — Акты + доработки
- Migration 005: entity type `act`, field_definitions, relation type `supplement_to`
- `autoLinkEntities`: ветка для act → создаёт `supplement_to` к договору + `subject_of` от оборудования
- Aggregate report: Path 2 (equipment → subject_of → act → supplement_to → contract) с суммой из act_items
- Frontend: форма создания акта с динамическим списком позиций (оборудование/сумма/описание)
- На карточке договора: секция "Акты" + кнопка "+ Акт"
- На карточке оборудования: секция "История работ" (все акты где участвует это оборудование)
- **Структура акта**: `parent_id = contract_id`, `act_items` = JSON-массив позиций, `supplement_to` relation + `subject_of` для каждой позиции
- Оборудование в форме акта фильтруется по equipment_list договора (_actEquipmentList)
- Поля parent_contract_id/name — readonly/hidden в edit-форме
- Migration 006: Эксплуатации → **Обслуживания**, поля service_subject / service_comment
- Migration 007: поле contract_end_date (Срок действия до) для contract + supplement
- Поле "в т.ч. НДС, %" добавлено в общие поля всех договоров
- **Изменяемый размер модальных окон**: стандарт / широкий (860px) / весь экран; setModalContent() / setModalSize() — ЗАПЛАНИРОВАНО, НЕ реализовано
- Latest deployed commit: `4026fb5` (2026-02-24) — debug alert в openCreateActModal

## Что реализовано (дополнение, 2026-02-23)
- Защита от дубликатов: POST /entities проверяет LOWER(name)+entity_type_id → 409 с данными существующей
- frontend api(): err.status + err.data; 409 без auto-alert
- _doSubmitCreate(): confirm() диалог при 409, открывает существующую сущность
- Пивот-таблица: _pivotCellData (rows/cols/cells с массивами сущностей), кликабельные ячейки
- showPivotCellDetail(): drill-down карточки под таблицей
- "Итого, договоры" — единицы в заголовке итоговой колонки
- Исправлен контракт id=6: our_legal_entity «Звезда» с правильными кавычками
- Аудит меток полей пивота — все переименованы, убраны дублирующие
- Equipment inline-create в форме договора аренды
- autoLinkEntities() создаёт subject_of relation (equipment → contract)
- **Pivot equipment mode** (commit 8a010c9, ЗАДЕПЛОЕН):
  - Авто-определение: если в зонах строк/колонок есть eq_* поля → equipment mode
  - Считает единицы оборудования, дедупликация по equipment_id
  - eq_* virtual fields: eq_name, eq_category, eq_kind, eq_status, eq_inv_number, eq_manufacturer

## Что реализовано (2026-02-25) — Анализ аренды (частично)
- Migration 009: переименование balance_owner → Собственник; land_plot/building fields; `located_on` relation
- Building form: Собственник (company selector), land_plot selector, quickCreateLandPlot(), `located_on` relation
- "История работ" report tab: backend `GET /reports/work-history`, таблица: строки=оборудование, колонки=даты актов, ячейки=описания+суммы+ссылки, Итого ₽
- AGG_CONTRACT_TYPES: исключены Аренды/Субаренды (вынесены в отдельную вкладку)
- "+ Акт" 409 дублирует → confirm диалог (commit `16f7bcc`)
- "Анализ аренды" tab: **бэкенд + HTML/CSS задеплоены, JS функции НЕ завершены**
  - Backend: `GET /api/reports/rent-analysis` флаттенит rent_objects из Аренда/Субаренда
  - Frontend: вкладка + секция + CSS есть, JS функции (buildRentAnalysis, renderRentTable, фильтры, группировка) не дописаны
  - Нужно: `_rentAllRows`, `_rentFilters`, `_rentGroupBy` + 7 функций (см. memory/2026-02-25.md)

## Что реализовано (2026-02-25 поздний вечер)
- **Тип помещения (object_type)** — единственная строка на сущности room; автоподставляется в форму аренды
- **Карточка договора аренды** — endpoint `GET /api/reports/contract-card/:id`; модальное окно в frontend
  - Показывает: арендатор, наш юрлицо, помещения+площади+ставки, ежемесячный платёж, переданное оборудование, история ДС
  - Аварийное оборудование в карточке подсвечивается красным
  - По умолчанию для аренды открывается карточка; кнопка "📋 Детали" — raw view
- **Красная подсветка аварийного оборудования** — теперь работает везде: карточка сущности + реестр (ранее только отчёты)

## Задеплоенный коммит
`0e6c472` (main) — fix: hide duplicate VAT for rent (2026-02-27 утро)

**Промежуточные коммиты (dev→main сегодня):**
- `e7b105d`, `438b7d7` — emergency/broken badges в agg report + entity registry
- `980c31b` / `719e7ae` — duplicate equipment level fix (eqAlreadyGrouped)
- `6ec6438` / `cb07486` — contract card view endpoint + frontend
- `124b130` / `2502808` — contract card как default view для аренды
- `8c9e3e3` / `db09f74` — emergency/broken везде включая бекенд

## ⚠️ КРИТИЧЕСКИЙ УРОК: `\'` внутри JS template literal
- `\'` внутри template literal → производит `'` (слеш СЪЕДАЕТСЯ!) в HTML output
- Это ломает inline onclick строки и крашит весь `<script>` блок
- **Правильно**: `\\'` (двойной слеш) → в HTML `\'` → в браузере работает
- **Лучше**: data-атрибуты вместо escaped кавычек в onclick

## Что реализовано (2026-02-26) — 9 задач + справочники

### 9 задач (коммит d77c5ad):
- Форма акта: каждый блок оборудования визуально отдельный. Исправлен баг: незакрытый `</div>` в `_renderActItem` — кнопка "+ Добавить оборудование" теперь работает
- `openSupplementCard(id)` — карточка ДС показывает только изменения
- В истории ДС договор кликабельный (открывает contractCard)
- Анализ аренды: группировка → фильтр-заголовки (таблица всегда плоская)
- Унифицировано "Тип помещения" везде (было "Тип объекта" в части мест)
- Полные inline-формы для помещения и оборудования (все поля)
- Кнопка "+ ДС" в карточке договора
- Создание ДС из реестра → сначала выбор договора

### Справочники (коммит af589f8):
- Вкладка "📋 Справочники" в настройках
- Бэкенд: `GET/PATCH /api/entity-types/settings/lists`
- Редактор списков: add/rename/delete пунктов, синхронизация OBJECT_TYPES/EQUIPMENT_CATEGORIES

## Что реализовано (2026-02-26) — Sidebar + Room form

- **Sidebar redesign** (42d9306): Документы + Реестры с аккордеон-группами; Корпуса → Помещения; Компании → Наши/Сторонние; lazy-loading; убраны workshop/crane_track/document из меню
- **"все помещения"** (4845a55): первый sub-item в Корпуса (italic, без фильтра) — orphan rooms (parent_id=null) всегда видны
- **Room form** (64fc7d5): Migration 016 скрывает room_number+room_type (sort_order=999); `renderRoomBuildingParent()` — dropdown только зданий; inline quick-create здания; `openCreateModal(type, preParentId)` — предвыбор здания
- **Справочник как единственный источник** (5833659): OBJECT_TYPES/EQUIPMENT_CATEGORIES/EQUIPMENT_STATUSES загружаются из БД при старте в startApp()
- **ДС наследует contract_type** (5833659): readonly badge + hidden input, тип договора нельзя менять в ДС
- **is_own=false фильтр**: IS DISTINCT FROM 'true' (ловит null/false/missing)
- **Orphan rooms**: [44] Цех Форман, [45] АБК Форман 3 этаж, [58] Склад Венгерского цеха — parent_id=null, видны через "все помещения", Валентина должна назначить корпуса

## Что реализовано (2026-02-26 вечер) — Dropdowns + inline editor

- **Убраны вызовы enrichFieldOptions** (14c44a3): все select/select_or_custom поля используют чистые `f.options` из справочника — никакого подмешивания значений из старых данных
- **Корпус и Арендатор в Подряда/Обслуживания** (14c44a3): добавлен `renderRegistrySelectField()` — dropdown из реестра (`_buildings` / `_allCompanies`) + "Другое..." для совместимости; сохраняет строку NAME
- **Убран inline-редактор расположения** (14c44a3): удалены `toggleParentEdit`, `saveParent`, кнопка "Изменить" и `parentEditBlock` с карточек сущностей

## ⚠️ КРИТИЧЕСКИЙ УРОК: `enrichFieldOptions` = зло
- `getUsedValues(fieldName)` скан `_allContractEntities` → подмешивает в списки значения из старых записей
- Никогда не восстанавливать: единственный источник — справочник (f.options из БД)

## Карта территории (реализована, 2026-02-26)
- Архитектура: `#mapViewport` → `#mapInner` (CSS transform) → `<img>` + `<svg viewBox="0 0 100 100" preserveAspectRatio="none">` + `<div id="mapLabels">`
- Zoom: wheel 8%/step + кнопки; pan: left-drag; state: `_mapZoom`, `_mapPanX/Y`
- SVG shapes: `<rect>` + `<polygon>`; масштабно-инвариантные (размеры / `_mapZoom`)
- Лейблы: HTML div, 13px, position:absolute; приоритет: `short_name` → `()` → full name
- short_name: Migration 017, поле в field_definitions для building + land_plot
- Цвета зон: яркие преsets, opacity ≥ 0.65 при рендере
- Файл карты: `server/public/maps/territory.jpg` (596KB), оригинал `Plan.jpg` (21MB)

## Что реализовано (2026-02-26 поздний вечер) — 12 задач

### Коммиты: 428a441, 502ea0e, 1a3af39, bdea6af, a23082c

1. **Поиск по субарендатору** ✅ — расширен SQL: ищет в e.name + properties subtenant_name/contractor_name/our_legal_entity
2. **Автономер ДС** ✅ — загружает существующие ДС для договора, вычисляет max+1, подставляет
3. **Скрыть parent_id для компаний** ✅ — уже было сделано ранее (land_plot + company excluded)
4. **Площадь ЗУ: га → кв.м.** ✅ — Migration 018: обновляет name_ru поля area для land_plot
5. **Собственник на карточке ЗУ** ✅ — добавлен balance_owner_id/name при создании; карточка уже читает balance_owner_name
6. **Спиннер загрузки** ✅ — CSS spinner-ring + showLoadingModal(); добавлен в openCreateModal, openEditModal, openCreateSupplementModal, openContractCard, openSupplementCard
7. **Поиск при выборе контрагента** ✅ — renderSearchableSelect: input + filtered dropdown + "Создать новую..." + mousedown/preventDefault
8. **НДС в ДС** ✅ — для non-Аренда/Субаренда: отдельное поле vat_rate; для Аренда: уже было в dynamic fields
9. **Собственник только наши + поиск** ✅ — balance_owner uses _ownCompanies + renderSearchableSelect
10. **Quick-create ЗУ** ✅ — inline panel: название, кадастровый номер, площадь, адрес, собственник
11. **Inline-создание компании** ✅ — уже было через "Другое..." + onEntityCustomConfirm
12. **Защита от дублей компаний** ✅ — fuzzy check (toLowerCase + strip punctuation + indexOf) + confirm dialog

### Searchable Select архитектура
- `renderSearchableSelect(id, entities, selectedId, selectedName, placeholder, fieldName)` → hidden input + text input + dropdown
- `_srchInitAll()` — вызывается после каждого setModalContent; binds focus/input/keydown/mousedown
- `_srchGetList(id)` — возвращает _ownCompanies для our_legal_entity/balance_owner, _allCompanies для остальных
- `_srchFilter(id)` — фильтрует список, рендерит items с data-srch-pick; mousedown+preventDefault для click-before-blur
- `_srchPick(id, entityId)` — устанавливает hidden value + text display
- `_srchPickNew(id)` — показывает custom input для создания новой
- `collectEntityIds` читает hidden input `f_contractor_name` (value = entity ID) — работает без изменений

## ✅ Задачи 1–12 — все завершены (2026-02-26)
1. Поиск по субарендатору — `428a441`
2. Автономер ДС — `502ea0e`
3. parent_id скрыт для компаний — (уже было)
4. Площадь ЗУ кв.м. — `428a441`
5. Собственник на CREATE — `428a441`
6. Спиннер загрузки — `1a3af39`
7. Searchable dropdown контрагент — `bdea6af`
8. НДС в ДС — `502ea0e`
9. Searchable dropdown собственник — `bdea6af`
10. Quick-create ЗУ inline — `a23082c`
11. Inline создание компании — (уже было)
12. Fuzzy защита от дублей — `a23082c`

## Дополнительно (2026-02-26 финал)
- **Mobile sidebar toggle** (`419beb1`): hamburger + overlay на < 768px
- **BI Views** (`1b3959b`): `v_bi_contracts`, `v_bi_supplements`, `v_bi_rent_objects`, `v_bi_equipment`, `v_bi_buildings`, `v_bi_acts` — PostgreSQL views для Metabase; Migration 020 в startup chain

## Что реализовано (2026-02-26 поздно) — Contract card + Emergency highlighting
- **Emergency/Broken highlighting везде**: `loadBrokenEquipment()` await в buildAggregateReport, runLinkedReport, showEntityList('equipment'); бейджи на листовых + eq_name узлах
- **Duplicate eq level fix**: `eqAlreadyGrouped` — пропускает eqGroups когда eq_name уже в иерархии
- **Contract card view**: `GET /api/reports/contract-card/:id` → renderContractCard(); collapsible секции; total_monthly; equipment_list с is_broken флагом
- **Contract card как default**: `showEntity(id, _forceDetail)` для аренды→card; `showEntityDetail(id)` wrapper; кнопка "⚙ Детали" для raw view
- **ER diagram**: `/root/workspace-indparkdocs/er-diagram.html`; скриншот отправлен Валентине

## Что реализовано (2026-02-27 утро)
- **Mobile iPhone fix**: viewport-fit=cover, 100dvh, safe-area-inset, async race condition guard
- **Metabase BI**: пирог площадей + stacked bar по корпусам на дашборде; SQL с fuzzy match зданий + фильтр внешней аренды
- **URL routing**: `#entity/ID` для deep links из Metabase → карточка сущности
- **Drill-down дашборд**: dashboard 13 "Аренда по корпусам" с click → IndParkDocs
- **SVG donut drill-down**: 3 уровня (total → buildings → contracts) на странице Обзор
- **Форма аренды**: убраны "Периодичность оплаты"/"Типы предметов КП", автозаполнение площади из помещения, убран дубль НДС, роль+компания на одной строке
- **Эл. мощность**: `has_power_allocation` + `power_allocation_kw` для аренды/субаренды
- **ДС**: срок действия всегда раскрыт, убран дубль номера
- **Контакты компаний**: множественные контакты с должностью (field_type=contacts, JSON массив)

## Что реализовано (2026-03-02) — Финансы 1С + Контакты
- **Живая страница `/finance`**: `finance-dashboard.html` загружает данные из 1С OData в реальном времени
- **Endpoint `GET /api/finance/overdue?org=<key>`**: считает долг per contractor, aging buckets (0-30/31-60/61-90/90+)
- Вкладки ИПЗ / ЭКЗ, тёмная тема, Chart.js графики (bar + donut)
- **`/api/finance/summary`** — endpoint для встроенной SPA-страницы (showFinancePage), KPI карточки + месячный график
- **Контакты компаний (contacts field_type)**: JSON массив `[{name, position, phone, email}]`, старые поля скрыты (sort_order=999)
- ⚠️ Frontend рендеринг contacts НЕ ЗАВЕРШЁН (~line 1186 в frontend.js)
- **2FA включена** для valentina (requireTotp=true) — блокирует curl-тестирование

### Исправления финансового модуля (2026-03-02 вечер)
- **Расчёт долга (ОСВ сч.62)**: `Document_РеализацияТоваровУслуг` (Дт62) − `ОплатаПокупателя` (Кт62) = 7 должников, ~8.6M по ИПЗ
  - Было: `СчетНаОплатуПокупателю` − все `ПоступлениеНаРасчетныйСчет` → включало депозиты/межбанк → неверно
- **`odataGetAll(basePath, pageSize=1000)`**: цикл `$skip` до исчерпания; критично т.к. 3390 счетов / 4395 платежей
- **5-мин кеш `/overdue`**: `cacheGet`/`cacheSet` в finance.js, ключ `overdue_<orgKey>`
- **VPN watchdog**: `/usr/local/bin/vpn-watchdog.sh` (cron `*/5 * * * *`); LCP keepalive в options.l2tpd.zvezda
- **UUID резолвинг контрагентов**: `$top=3000` + fallback `Ref_Key eq guid'...'` → все 11 проблемных UUID закрыты
- Коммиты: `fix: fallback UUID`, `fix: paginate all invoices/payments`, `fix: use РеализацияТоваровУслуг+ОплатаПокупателя`, `fix: 5min cache + VPN watchdog`

### Бюджетный дашборд /budget (2026-03-02)
- Таблица `budget_data` в PostgreSQL: `(budget_type, cfo, article, level, fact NUMERIC[], plan NUMERIC[], total_fact, total_plan)`; UNIQUE on `(budget_type, cfo, article)`
- Импорт: `/root/workspace-indparkdocs/scripts/import_budget.py` (2360 строк, re-runnable upsert)
- Источники: `/tmp/budget_2026_bdds.xlsx` (953 строк, 17 ЦФО) и `/tmp/budget_2026_bdr.xlsx` (1417 строк, 27 ЦФО)
- Колонки Excel: ФАКТ=col[3+n*4], ПЛАН=col[4+n*4] (n=0..11), Итого ФАКТ=col[51], ПЛАН=col[52]
- CFO зафиксирован на "ИП" (АО ИПЗ) — нет dropdown
- Дашборд: `/root/workspace-indparkdocs/server/src/budget-dashboard.html` — тёмная тема, КПИ (factYTD/planYTD/devYTD), топ-7 отклонений, drill-down
- Маршруты в finance.js: `GET /api/finance/budget`, `/api/finance/budget/meta`, `/api/finance/budget/rent-drilldown`
- Блендинг: месяцы < currentMonth → факт, >= → план; отклонение = blended − full-year ПЛАН
- Встроен в SPA через `showBudgetPage()` → iframe; ссылка "📈 Бюджеты" в sidebar

### Drill-down арендаторов (2026-03-02)
- `GET /api/finance/budget/rent-drilldown`: реализация из 1С + join с договорами в IndParkDocs
- Двухуровневый фильтр: отклонение < -50k ₽ от договора ИЛИ тренд-падение > 15% AND > 100k ₽
- Макс 10 контрагентов, sorted by worst combined score
- Frontend: 2 секции — красный (ниже договора) + жёлтый (резкое снижение)
- Результат Янв–Фев 2026: 8 контрагентов (РЭС, ЭК ЗВЕЗДА, ЛЗМ, МИРБАХ, ЭМКОМ, СТЕКЛО-ЖИЗНЬ, СЕВЕРНЫЙ ЛУЧ, УНИВЕРСАЛ)
- ⚠️ Только 4 договора аренды в БД для ИПЗ → 38 из 42 контрагентов "нет в системе" → deviation только через тренд
- VPN watchdog улучшен: полный цикл `ipsec down/up` (устранил stale SA); keepalive в options.l2tpd.zvezda

## 🚧 В очереди (не реализовано)
- **🐛 Краны: нестинг в дереве** — все краны (id:30-41, `parent_id=29`) отображаются вложенными под первый кран в каком-то tree-widget во frontend; данные в БД ВЕРНЫЕ; баг в frontend tree-rendering; нужно найти и исправить
- **Room form cleanup** — Migration 015: удалить `room_type` из field_definitions + добавить `room_number` (text, sort_order=4) с ON CONFLICT DO NOTHING
- **Карта: полигоны (ПРЕРВАНО)** — SVG overlay; drag rect, click+dblclick polygon; секция ~2247–2515 в frontend.js
- **BI/Metabase** — подключить когда база наполнится данными (views уже готовы)
- **📊 Структура владения** *(ER → согласование)*
- **👤 Разные контакты** *(ER → согласование)*
- **📋 Предметы договора услуг** *(ER → согласование)* — предмет + объект (оборудование/корпус/ЗУ) + цена + срок выполнения
- **🛒 Договор купли-продажи — предмет и связи** *(ER → согласование)*
- **🏢 Несколько корпусов в договоре обслуживания** *(backlog, 2026-02-26)* — сейчас только один корпус; нужен multi-select / повторяемые блоки корпус+оборудование
- **⚙️ Данные: разнести ИК обогреватели 10к по блокам** *(backlog, 2026-02-26)* — сейчас одна запись "ИК обогреватели 10к"; нужно разбить по блокам + обновить договор Адмос на обслуживание с правильным количеством
- **🔍 Полнотекстовый поиск по всем полям** *(backlog, 2026-02-26)* — сейчас ищет только по name + отдельным properties; нужно искать по всем полям (пример: "ИК" находит договор с предметом "ИК обогреватели"); реализовать через `properties::text ILIKE $1` или отдельный индекс GIN

## Правила workflow
- **Всегда план → ОК Валентины → код**. Никаких самовольных правок!
- **НИКОГДА не добавлять/изменять ничего из схемы без явного согласования!**
  Это касается: entity types, поля сущностей, relation types, связи, списки (справочники) — и вообще всё, что закреплено в схеме.
  Алгоритм: сообщить что именно нужно изменить → прислать **обновлённую схему** → дождаться ОК от Валентины → только потом код.
- `\'` внутри template literal → `'` (слеш съедается). Всегда использовать data-атрибуты или `\\'`
- Перед пушем проверять JS скрипты:
```bash
cd /root/workspace-indparkdocs/server && node -e "const html = require('./src/frontend.js'); const scripts = html.match(/<script>([\s\S]*?)<\/script>/g) || []; let ok=true; scripts.forEach((s,i)=>{const body=s.replace(/<\/?script>/g,''); try{new Function(body);}catch(e){console.error('Script block '+i+' ERROR:',e.message);ok=false;}}); if(ok) console.log('All scripts OK');"
```

## Планы / Next Steps
- **Контакты**: дописать frontend рендеринг field_type='contacts' (~line 1186 в frontend.js)
- **Контакты**: миграция старых contact_person/phone/email → новый JSON формат
- **Финансы**: date range filter UI для `/finance` (сейчас hardcoded 2025-01-01)
- **Финансы**: stale data fallback при недоступности VPN (показывать кеш с timestamp)
- **Бюджет 1С live data**: запросить у 1С admin права на `Document_бит_ФормаВводаБюджета`, `Document_бит_БюджетнаяОперация`, `AccumulationRegister_бит_ОборотыПоБюджетам`
- **Аренда drill-down**: добавить больше договоров аренды в IndParkDocs → contract deviation заработает для большинства контрагентов
- **DNS**: добавить A-record `docs → 89.167.75.91` для `docs.zvezda-park.com` (Валентина делает в DNS)
- Дописать JS функции для "Анализ аренды"
