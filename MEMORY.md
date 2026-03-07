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
- Файлы в `server/src/migrations/` (001-024 + merge_orr_vesta)
- index.js подключает их через require() и запускает через runOnce()
- Новая миграция: создать файл `server/src/migrations/025_auto.js` с сигнатурой `module.exports = async function(pool) { ... }`, добавить в require-список и цепочку runOnce в index.js
- createBIViews() вынесена в `server/src/bi-views.js`
- Всегда использовать ON CONFLICT DO NOTHING / DO UPDATE

### CI
- GitHub Actions: .github/workflows/ci.yml
- npm ci (не npm install) — нужен синхронизированный package-lock.json
- Проверяет синтаксис + frontend JS через new Function()

### Frontend JS (МОДУЛЬНЫЙ — рефакторинг завершён 2026-03-03)
- **57 модулей** в `server/src/frontend/`. Структура:
  - `index.js` — точка входа, сборка HTML (порядок загрузки критичен!)
  - `core/utils.js` — escapeHtml, _fmtNum, _fmtDate (ЕДИНСТВЕННОЕ место!)
  - `core/api.js` — api() fetch wrapper (ЕДИНСТВЕННОЕ место!)
  - `core/globals.js` — ENTITY_TYPE_ICONS, entityIcon()
  - `core.js` — глобальные переменные, CONTRACT_TYPE_FIELDS, icon()
  - `components/` — amount-input, advances, contacts, duration, act-items, contract-items
  - `forms/` — field-input, equipment-form, land-plot-quick, contract-form
  - `modal.js` — showLoadingModal, setModalContent, closeModal
  - `pages/` — nav, totp, legal-zachety, dashboard, finance-page, budget-page, map-page
  - `entities/` — entity-list, entity-detail, entity-create, entity-edit, entity-delete, contract-card, supplement-card, entity-helpers, data
  - `reports/` — aggregate, pivot, linked-report, rent-analysis, work-history
  - `rent-objects.js`, `acts.js`, `supplements.js`, `land-plot-parts.js`
  - `relations.js`, `settings.js`, `ai-chat.js`
- **ВАЖНО**: entity-crud.js, entity-form.js, reports.js — пустые stubs (не редактировать!)
- Каждый модуль: `/* eslint-disable */\nmodule.exports = \`...JS code...\`;\n`
- Сборка отдаётся как один HTML (все модули конкатенируются в index.js)
- **Новые функции**: создавать новый файл в нужной папке + добавить в index.js
- ОПАСНЫЕ конструкции:
  - `\'string\'` внутри template literal → становится `'string'` и ломает строки в new Function
  - Решение: использовать data-* атрибуты вместо строк в onclick, или `\\' ` 
  - `\d` внутри template literal → `d` (бэкслеш съедается) → писать `\\d` для регулярок
  - catch {} без параметра
- Проверка JS: `cd server && node -e "const html = require('./src/frontend.js'); ..."` (или npm test)

### Тесты и CI
- **Тест-сьют**: `server/tests/` — 8 файлов, **94 теста**; `npm test` в папке server
- `tests/__mocks__/otplib.js` — ESM mock (ОБЯЗАТЕЛЕН для Jest)
- Mock pattern: `jest.fn().mockResolvedValue({ rows: [] })` объявлять сразу (до beforeEach!)
- `moduleNameMapper` для otplib в `package.json` jest config
- **Pre-deploy**: `bash scripts/pre-deploy.sh` от корня — 7 проверок (1-6 блокируют, 7 advisory)

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

## ⚠️ КРИТИЧЕСКИЙ УРОК: `\'` внутри JS template literal
- `\'` внутри template literal → производит `'` (слеш СЪЕДАЕТСЯ!) в HTML output
- Это ломает inline onclick строки и крашит весь `<script>` блок
- **Правильно**: `\\'` (двойной слеш) → в HTML `\'` → в браузере работает
- **Лучше**: data-атрибуты вместо escaped кавычек в onclick

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

## Текущий HEAD (07.03.2026 — 15:55 UTC)
- **`origin/main`** = после PR #152 (AI chat timeout 90s)
- **Тесты**: 251 тест, 12 сьютов ✅
- **Сервис**: active ✅
- **Миграции**: 001–043 все применены
- **Ветка в работе**: `feature/ipd-split-reports-rentobjects` (commit: 170d8ed) — PR готов, нужен merge

## ✅ Выполнено (07.03.2026)

### PRs #137–#148 — Code Review + fixes
- **#137**: fix f_subject не сохранялся для Работы/Подряда (collectDynamicFieldValues)
- **#138**: grouped equipment lists (по equipment_category, sticky headers, без JSON)
- **#139**: убран чекбокс ВГО из формы (авто на бэкенде)
- **#140–#142**: предмет для аренды (промежуточные фиксы, заменены #146)
- **#144**: security fixes — letters.js без auth, JWT_REFRESH_SECRET отдельный, finance db→pool, migration 039 (btree indexes)
- **#145**: dead code (_allEntitiesForParent удалён), ORG GUIDs в env, +15 тестов (finance/cube/floorplan)
- **#146**: предмет договора из DB (located_in subquery в entities.js), убрана вся JSON-логика
- **#147–#148**: migration 040 backfill located_in relations + bugfix (ambiguous id)

### PRs #149–#152 — Нормализация данных + AI fix
- **#149**: migration 041 — 5 JSON-массивов → реляционные таблицы (rent_items, act_line_items, contract_line_items, contract_advances, contract_equipment); хелперы parseArr/loadLineItems/saveLineItems в entities.js
- **#150**: migration 042 — field_option_values (71 строка, 14 полей); injectOptions/saveOptions в entityTypes.js; fd.options синхронизируется
- **#151**: migration 043 — supplement contract_type наследуется от родителя; field_def id=35 удалена; effective_contract_type COALESCE в entities.js
- **#152**: AI chat timeout 30s → 90s (multi-step tool chains)

### Написан SPEC_PRODUCT.md
- `/root/workspace-indparkdocs/SPEC_PRODUCT.md` (235 строк)
- 11 разделов: цель, модули, типы сущностей, field definitions, relations, lifecycle, нормализованные таблицы, dropdowns, интеграции, роли, архитектурные принципы

### Архитектурные решения (07.03)
- **located_in_names**: новое virtual поле в GET /api/entities — string_agg из located_in relations
- **Предмет договора**: для Аренды/Субаренды ВСЕГДА из e.located_in_names, не из JSON
- **ВГО**: только бэкенд, форма не показывает
- **JWT_REFRESH_SECRET**: отдельный секрет, требуется в production, добавлен в systemd

### Системные изменения
- JWT_REFRESH_SECRET и ORG_GUID_IPZ/EKZ добавлены в /etc/systemd/system/indparkdocs.service
- Migration 039: индексы на contract_type, contractor_id, our_legal_entity_id, doc_status
- Migration 040: backfill located_in relations из старых rent_objects JSON

## ✅ Выполнено (07.03.2026 — вечер, ~15:55 UTC)

### PR #153 — Split refactor: reports.js + rent-objects.js
- **Backend**: `server/src/routes/reports.js` (1258 строк) → `reports/` директория:
  - `helpers.js` — `_odataGetRpt`, `resolveRoArea`, `latestSuppValue`, ODATA-константы
  - `pivot.js` — /pivot, /fields, /linked, /aggregate
  - `rent.js` — /rent-analysis, /area-stats
  - `work.js` — /work-history, /broken-equipment
  - `contract-card.js` — /contract-card/:id, /advance-status
  - `index.js` — монтирует все sub-routers
- **Frontend**: `server/src/frontend/rent-objects.js` (1008 строк) → `rent-objects/` директория:
  - `shared.js` — globals, comments, calc fields
  - `room-block.js` — room/land plot rent blocks
  - `equipment-block.js` — equipment rent blocks
  - `index.js` (в `server/src/frontend/index.js`) обновлён
- 251 тест, 12 сьютов — все зелёные ✅
- Ветка: `feature/ipd-split-reports-rentobjects` (commit: 170d8ed)

## Планы / Next Steps (backlog)
- **Merge PR #153** — `gh pr merge 153 --squash --admin --delete-branch` (split refactor готов)
- **SPEC_TECH.md** — написать техническую спецификацию (SPEC_PRODUCT.md готов)
- **040626/PRT-ИП-З-1** — пересохранить через форму (помещение free-text → создать entity)
- Code review backlog: reports.js монолит (1258 строк), health.js IP allowlist, create-admin.js stdin
- Заполнить `inv_number` для eq id=581 (ЖД путь инв. №593000) — поле пустое
- Добавить больше договоров аренды (38 из 42 арендаторов не в системе)
- Date range filter для Должники (overdue hardcoded 2025-01-01)
- Финансы: stale data fallback при недоступности VPN
- Бюджет 1С live: нужен доступ к бюджетным регистрам
- Полнотекстовый поиск по всем полям
- **Breadcrumb навигация** — скриншот от Валентины, не реализована
- **Замена emoji → Lucide** (117 в 32 файлах) — DESIGN.md правила
- **formatAmount** — решить: удалить из требований или алиас

## ⚠️ Новые правила (03.03.2026)

### Branch Protection настроен на GitHub:
- **main**: прямые пуши ЗАПРЕЩЕНЫ — только через PR + CI должен пройти → автодеплой
- **dev**: force push запрещён

### Многоагентная работа:
- В проекте работают 2 агента: main (Opus) и indparkdocs (Sonnet)
- **ОБЯЗАТЕЛЬНО**: каждая задача = своя feature-ветка от **main** (не dev — dev устарел)
- Имя ветки: `feature/ipd-название` ✅
- Никогда не пушить прямо в main!
```bash
git checkout main && git pull origin main
git checkout -b feature/ipd-название-задачи
# ... работа ...
git push origin feature/ipd-название-задачи
gh pr create --base main --title "feat: описание"
# merge:
gh pr merge NNN --squash --admin --delete-branch
```
- **ВАЖНО**: не делать `git commit` прямо на main — только в feature-ветке!
- При случайном коммите в main: `git checkout -b feature/имя && git checkout main && git reset --hard origin/main`
