# IndParkDocs — Техническая спецификация

**Стек:** Node.js 22 + Express + PostgreSQL + inline SPA  
**Сервер:** ubuntu-4gb-hel1-2, IP 89.167.75.91, Hetzner  
**URL:** https://docs.zvezda-park.com  
**Версия спеки:** 1.0 (март 2026)

---

## 1. Стек

| Слой | Технология | Версия |
|------|-----------|--------|
| Runtime | Node.js | 22.x |
| HTTP-сервер | Express | 4.x |
| БД | PostgreSQL | (Docker) |
| ORM | нет (pg Pool, raw SQL) | — |
| Фронтенд | Inline SPA (vanilla JS) | — |
| Сборка | нет (server-side concat) | — |
| Тесты | Jest + Supertest | — |
| Аутентификация | JWT (access + refresh) + TOTP | — |
| Reverse proxy | Nginx | — |
| Process manager | systemd | — |

**Ключевой принцип фронтенда:** весь клиентский код — ES5 vanilla JS, собирается сервером в один `<script>` блок и отдаётся как часть единственного HTML-файла. Нет Webpack, Vite, React, Vue.

---

## 2. Инфраструктура

```
Internet
  └── Nginx (80/443, SSL)
        └── Node.js :3002 (systemd: indparkdocs)
              ├── PostgreSQL (Docker, порт 5432)
              └── 1С OData (через VPN L2TP/IPsec → 192.168.2.3)
```

**Nginx:** `/etc/nginx/sites-available/docs.zvezda-park.com`  
Проксирует `docs.zvezda-park.com → 127.0.0.1:3002`

**Systemd:** `/etc/systemd/system/indparkdocs.service`  
Все секреты в `Environment=` строках сервиса (не в .env-файлах).

**PostgreSQL в Docker:**
```
postgresql://indpark:indpark2026@127.0.0.1:5432/indparkdocs
```

**VPN watchdog:** `/usr/local/bin/vpn-watchdog.sh`, cron каждые 5 минут.  
Поднимает L2TP/IPsec туннель при падении. Маршрут: `192.168.2.0/24 → ppp0`.

---

## 3. Структура файлов

```
/root/workspace-indparkdocs/
├── server/
│   ├── src/
│   │   ├── index.js              # Entry point: migrations → BI views → listen
│   │   ├── db.js                 # pg Pool
│   │   ├── logger.js             # pino logger
│   │   ├── run-migrations.js     # Migration runner (runOnce pattern)
│   │   ├── bi-views.js           # Materialized BI views (createBIViews)
│   │   ├── sync-metabase.js      # Metabase sync (stub)
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT authenticate/authorize
│   │   │   ├── audit.js          # logAction → audit_log
│   │   │   ├── errorHandler.js   # asyncHandler, global error middleware
│   │   │   └── validate.js       # Joi schemas + validate()
│   │   ├── routes/               # 16 route files (см. раздел 5)
│   │   ├── utils/
│   │   │   └── contractDirection.js  # isAllPartiesInternal, computeAndSaveVgo
│   │   ├── migrations/           # 43 migration files (001–043)
│   │   └── frontend/             # 22 frontend JS modules
│   │       ├── index.js          # Concat all modules → HTML
│   │       ├── core/             # utils, api, globals
│   │       ├── components/       # UI компоненты
│   │       ├── forms/            # Формы
│   │       ├── entities/         # Карточки, списки, CRUD
│   │       ├── pages/            # Страницы (навигация, финансы, карта...)
│   │       └── reports/          # Отчёты
│   ├── tests/                    # Jest тесты (109 тестов, 10 сьютов)
│   ├── public/
│   │   └── maps/territory.jpg    # Карта территории (596 KB)
│   └── package.json
├── SPEC_PRODUCT.md
├── SPEC_TECH.md
├── IDENTITY.md                   # Workflow разработки
├── DESIGN.md                     # UI/UX правила
├── MEMORY.md                     # Долгосрочная память агента
└── TOOLS.md                      # Конфигурация инструментов
```

---

## 4. База данных

### Основные таблицы

#### `entity_types`
```sql
id, name (slug), name_ru, icon, color, sort_order
```
17 типов. Конфигурируются через UI без изменения кода.

#### `entities` (центральная таблица)
```sql
id, entity_type_id → entity_types,
name,
properties JSONB,      -- все доп. поля (скалярные значения)
parent_id → entities,  -- иерархия (ДС → Договор, Помещение → Корпус)
created_at, updated_at, deleted_at  -- soft delete
```
**Правило:** `properties` хранит только скалярные значения (строки, числа, даты, булевы). Массивы бизнес-записей — в отдельных таблицах.

#### `field_definitions`
```sql
id, entity_type_id, name, name_ru, field_type, options (jsonb, sync-copy), required, sort_order
```
Типы полей: `text`, `number`, `date`, `select`, `select_or_custom`, `boolean`, `entity_selector`, `textarea`.

#### `field_option_values` (нормализованный справочник)
```sql
id, field_definition_id → field_definitions (CASCADE),
value TEXT, sort_order
UNIQUE(field_definition_id, value)
```
Единственный источник правды для значений dropdown-полей.

#### `relations`
```sql
id, from_entity_id → entities, to_entity_id → entities,
relation_type (FK → relation_types),
created_at, deleted_at
```
Типы связей: `party_to`, `located_in`, `supplement_to`, `subject_of`, `on_balance`, `installed_on`, `services`, `rents`, `act_for`.

#### `relation_types`
```sql
id, name, name_ru, color, description
```

### Таблицы строк документов

| Таблица | FK | Ключевые поля |
|---------|----|----|
| `rent_items` | `contract_id → entities` | entity_id, object_type, area, rent_rate, net_rate, utility_rate, calc_mode, comment, sort_order |
| `act_line_items` | `act_id → entities` | equipment_id, name, amount, description, comment, broken, sort_order |
| `contract_line_items` | `contract_id → entities` | name, unit, quantity, price, amount, sort_order |
| `contract_advances` | `contract_id → entities` | amount, date, sort_order |
| `contract_equipment` | `contract_id → entities` | equipment_id, rent_cost, sort_order; UNIQUE(contract_id, equipment_id) |

Все таблицы: `ON DELETE CASCADE` по FK к `entities`.

### Вспомогательные таблицы

| Таблица | Назначение |
|---------|-----------|
| `users` | Пользователи (id, username, role, password_hash, totp_secret) |
| `refresh_tokens` | JWT refresh токены (с expires_at) |
| `audit_log` | Лог всех действий (user_id, action, entity_type, entity_id, details, ip) |
| `entity_files` | Прикреплённые файлы к сущностям |
| `ai_messages` | История AI-чата (role, content, tokens) |
| `ai_token_usage` | Учёт потребления токенов по сессиям |
| `budget_data` | Кэш бюджетных данных из 1С |
| `legal_zachety` / `legal_zachety_lines` | Акты зачёта взаимных требований |
| `legal_contracts` | Привязка зачётов к договорам |
| `letter_topics` | Темы писем |
| `_migrations` | Трекер применённых миграций |

### Индексы (migration 039)
```sql
idx_entities_contract_type      ON entities (properties->>'contract_type') WHERE deleted_at IS NULL
idx_entities_contractor_id      ON entities (properties->>'contractor_id') WHERE deleted_at IS NULL
idx_entities_our_legal_entity   ON entities (properties->>'our_legal_entity_id') WHERE deleted_at IS NULL
idx_entities_doc_status         ON entities (properties->>'doc_status') WHERE deleted_at IS NULL
```

---

## 5. API

Все роуты требуют JWT (`Bearer token` или cookie `accessToken`).  
Base URL: `https://docs.zvezda-park.com/api`

### Auth `/api/auth`
| Метод | Путь | Описание |
|-------|------|---------|
| POST | `/login` | Вход (username + password [+ totp]) → access/refresh tokens |
| POST | `/refresh` | Обновить access token через refresh cookie |
| POST | `/logout` | Инвалидировать refresh token |
| POST | `/register` | Создать пользователя (admin only) |
| POST | `/change-password` | Изменить пароль |
| GET | `/me` | Текущий пользователь |
| GET | `/users` | Список пользователей (admin only) |

### Entities `/api/entities`
| Метод | Путь | Описание |
|-------|------|---------|
| GET | `/` | Список сущностей. Параметры: `type`, `types`, `parent_id`, `search`, `is_own`, `limit`, `offset` |
| GET | `/:id` | Сущность + дети + связи + файлы + строки документов (из нормализованных таблиц) |
| GET | `/:id/work-history` | История работ по оборудованию (акты) |
| POST | `/` | Создать сущность + автосвязи + сохранить строки документов |
| PUT | `/:id` | Обновить + пересоздать автосвязи + обновить строки |
| PATCH | `/:id` | Частичное обновление (alias PUT) |
| DELETE | `/:id` | Soft delete |

**Автосвязи** (`autoLinkEntities`): при сохранении договора автоматически создаются связи `party_to` (стороны) и `located_in` (объекты из `rent_objects`/`subject_*` полей).

**Виртуальные поля** в GET-ответе:
- `located_in_names` — string_agg имён связанных объектов через `located_in`
- `effective_contract_type` — COALESCE(своё, родительское) — для ДС
- `effective_our_legal_entity`, `effective_contractor_name` — с fallback на родителя

### Entity Types `/api/entity-types`
| Метод | Путь | Описание |
|-------|------|---------|
| GET | `/` | Все типы сущностей |
| GET | `/:typeId/fields` | Поля типа (с options из field_option_values) |
| POST | `/:typeId/fields` | Добавить поле |
| DELETE | `/fields/:id` | Удалить поле |
| GET | `/settings/lists` | Все select-поля для редактирования справочников |
| PATCH | `/settings/lists/:fieldId` | Обновить значения справочника |

### Finance `/api/finance`
| Метод | Путь | Описание |
|-------|------|---------|
| GET | `/summary` | Сводка ДДС за период (из 1С) |
| GET | `/overdue` | Должники (дебиторка из 1С) |
| GET | `/budget` | Бюджет план/факт ЦФО ИП (из 1С + DB) |
| GET | `/budget/rent-drilldown` | Drill-down по аренде |
| GET | `/budget/meta` | Метаданные бюджета |
| GET | `/expenses` | Расходы по статьям (из 1С) |

### Reports `/api/reports`
| Метод | Путь | Описание |
|-------|------|---------|
| GET | `/aggregate` | Сводная таблица договоров |
| GET | `/rent-analysis` | Анализ аренды (площади, ставки, временная шкала) |
| GET | `/pivot` | Pivot-таблица |
| GET | `/linked` | Связанные объекты |
| GET | `/area-stats` | Статистика площадей |

### Cube `/api/cube`
| Метод | Путь | Описание |
|-------|------|---------|
| POST | `/query` | OLAP-запрос: `{rowDims, colDims, filters}` → pivot data |
| GET | `/filter-values` | Допустимые значения фильтров |
| GET | `/drilldown` | Детали по ячейке |
| GET | `/act-drilldown` | Детализация по актам |

### Другие роуты
| Prefix | Описание |
|--------|---------|
| `/api/relations` | CRUD связей |
| `/api/companies` | Поиск компаний, импорт из 1С, sync ИНН |
| `/api/files` | Загрузка/удаление файлов (multer) |
| `/api/legal` | Зачёты взаимных требований |
| `/api/letters` | Письма и темы |
| `/api/ai/chat` | AI Аналитик (chat, history, usage) |
| `/api/buildings` | Поэтажные планы (room-status, floor-plans) |
| `/health` | Health check |

---

## 6. Аутентификация и безопасность

**JWT:**
- Access token: 15 мин, в заголовке `Authorization: Bearer` или cookie `accessToken`
- Refresh token: 7 дней, httpOnly cookie `refreshToken`, хранится в `refresh_tokens` БД
- `JWT_SECRET` и `JWT_REFRESH_SECRET` — разные секреты, обязательны в production

**TOTP (2FA):**
- Опциональный, настраивается через `/totp` страницу
- Код проверяется при логине если включён

**Rate limiting:**
- Логин: 10 попыток / 15 мин (express-rate-limit)
- AI чат: отдельный лимитер

**HTTP Security (Helmet.js):**
- CSP, X-Frame-Options, HSTS, X-Content-Type-Options

**Правила безопасности БД:**
- Все запросы параметризованы ($1, $2)
- AI-ассистент: только `SELECT` / `WITH ... SELECT`, read-only транзакция
- Soft delete (никогда не удаляем физически)

---

## 7. Фронтенд

### Архитектура
Весь фронтенд — ES5 vanilla JS, без сборщика. Сервер конкатенирует 22 модуля в один `<script>` блок и отдаёт в составе единственного HTML-ответа на любой GET-запрос.

```
frontend/
├── index.js           # Точка входа: собирает HTML + подключает все модули
├── css.js             # Все стили (единый <style> блок)
├── layout.js          # Шаблон страницы
├── core/
│   ├── utils.js       # escapeHtml, _fmtNum, _fmtDate
│   ├── api.js         # fetch wrapper api(url, opts)
│   └── globals.js     # ENTITY_TYPE_ICONS, entityIcon(), CONTRACT_TYPE_FIELDS
├── core.js            # Глобальные переменные, CONTRACT_ROLES
├── searchable-select.js  # Компонент поискового select с группировкой
├── components/        # amount-input, advances, contacts, duration,
│                      # contract-items, act-items, subject-objects,
│                      # sale-contract, file-upload
├── forms/             # field-input, equipment-form, land-plot-quick, contract-form
├── modal.js           # showLoadingModal, setModalContent, closeModal
├── entities/          # entity-list, entity-detail, entity-create, entity-edit,
│                      # entity-delete, contract-card, supplement-card,
│                      # entity-helpers, data
├── rent-objects.js    # Форма объектов аренды
├── acts.js            # Форма актов
├── supplements.js     # Форма ДС
├── land-plot-parts.js # Части ЗУ
├── relations.js       # Управление связями
├── settings.js        # Страница настроек
├── ai-chat.js         # Виджет AI-аналитика
└── pages/             # nav, totp, legal-zachety, dashboard, finance-page,
                       # budget-page, map-page, building-floor-plan,
                       # letters-page, orders-page
```

### Навигация
Hash-based routing (`#list/contract`, `#detail/123`, `#map`).  
Breadcrumb-адресбар в шапке. Кнопка «← Назад».

### Правила UI (DESIGN.md)
- Только Lucide-иконки (без emoji в интерфейсе)
- CSS-переменные для цветов (`--bg-primary`, `--text-secondary`, etc.)
- Адаптивность: 320px / 768px / 1280px

---

## 8. Миграции

43 файла в `server/src/migrations/`. Паттерн `runOnce`:
```js
async function runOnce(pool, name, fn) {
  const { rows } = await pool.query('SELECT 1 FROM _migrations WHERE name=$1', [name]);
  if (rows.length > 0) return; // уже применена
  await fn(pool);
  await pool.query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
}
```
Миграции запускаются при каждом старте сервера. Идемпотентны.  
Новая миграция: создать `server/src/migrations/044_name.js`, добавить в `run-migrations.js`.

---

## 9. Тесты

**Команда:** `cd server && npm test`  
**Фреймворк:** Jest + Supertest  
**Текущее состояние:** 109 тестов, 10 сьютов ✅

| Файл | Что тестирует |
|------|--------------|
| `auth.test.js` | Логин, refresh, регистрация, смена пароля |
| `entities.test.js` | CRUD сущностей, дубли, авторизация |
| `entityTypes.test.js` | Типы, поля, справочники |
| `relations.test.js` | Создание/удаление связей |
| `reports.test.js` | Агрегаты, фильтры |
| `finance.test.js` | Auth guard финансовых роутов |
| `cube.test.js` | OLAP-запросы, filter-values |
| `floorplan.test.js` | Room-status, floor-plans |
| `legal.test.js` | Зачёты |
| `frontend.test.js` | Синтаксис JS-бандла (`new Function`) |

**БД в тестах:** мок (jest.fn().mockResolvedValue), реальная БД не нужна.  
**CI:** GitHub Actions запускает `npm ci && npm test && npm audit --audit-level=high && npx eslint .`

---

## 10. Деплой

**Workflow:**
```
feature/ipd-название  →  PR  →  main  →  автодеплой (CI)
```

**Правила веток:**
- `main` — защищённая, только через PR + CI зелёный
- `feature/ipd-*` — рабочие ветки от main
- Прямые пуши в main запрещены

**Локальный деплой (production = workspace):**
```bash
git pull origin main          # получить код
systemctl restart indparkdocs # перезапустить сервис (~2 сек)
```

**GitHub Actions деплой:** push в main → SSH на сервер → `git pull && systemctl restart`.

**Переменные окружения (в systemd service):**
```
NODE_ENV=production
PORT=3002
DATABASE_URL=postgresql://indpark:indpark2026@127.0.0.1:5432/indparkdocs
JWT_SECRET=...
JWT_REFRESH_SECRET=...
ODATA_BASE_URL=http://192.168.2.3/BF/odata/standard.odata
ODATA_USER=odata.user
ODATA_PASS=...
ANTHROPIC_API_KEY=...
ORG_GUID_IPZ=...
ORG_GUID_EKZ=...
```

---

## 11. Известные ограничения

| Ограничение | Описание |
|-------------|---------|
| ES5 фронтенд | Нет TypeScript, нет модулей в браузере. Все функции — глобальные |
| `reports.js` 1258 строк | Монолит, кандидат на разделение |
| `rent-objects.js` 1008 строк | Сложная форма, не разделена |
| JSON в `properties` (резерв) | Нормализованные поля всё ещё дублируются в JSONB как кэш |
| Нет полнотекстового поиска | Поиск только по имени/номеру/контрагенту |
| 1С бюджет | `Document_бит_ФормаВводаБюджета` — нет доступа, нужен 1С-админ |
