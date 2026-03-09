# ARCHITECTURE.md — Правила хранения данных IndParkDocs

## Принцип: один источник правды

Каждый факт хранится **ровно в одном месте**. Никаких копий, дублей, кэшей в JSON.

---

## Где что хранить

### 1. Колонки таблицы `entities` — структурные данные
| Колонка | Что хранит |
|---------|-----------|
| `id` | Уникальный идентификатор |
| `name` | Отображаемое имя (генерируется при создании) |
| `entity_type_id` | Тип сущности (contract, company, equipment...) |
| `parent_id` | Иерархия (здание → помещение → оборудование) |
| `created_at` / `deleted_at` | Жизненный цикл |

### 2. `entities.properties` (JSONB) — собственные атрибуты
**Только данные, которые принадлежат самой сущности:**
- Даты: `contract_date`, `end_date`, `signing_date`
- Номера: `number`
- Суммы: `contract_amount`, `vat_rate`, `one_time_amount`
- Статусы: `doc_status`, `charge_type`, `payment_status`
- Текстовые описания: `subject`, `notes`
- Метки ролей: `our_role_label`, `contractor_role_label` (как называть стороны)
- Специфичные для типа: `serial_number` (оборудование), `cadastral_number` (ЗУ)

**✅ Правило: если значение НЕ ссылается на другую сущность — это properties.**

### 3. Таблица `relations` — все связи между сущностями
| relation_type | from → to | properties.role | Пример |
|--------------|-----------|----------------|--------|
| `contractor` | contract → company | — | Договор → Контрагент |
| `our_entity` | contract → company | — | Договор → Наше юр.лицо |
| `subtenant` | contract → company | — | Договор → Субарендатор |
| `supplement_to` | supplement → contract | — | ДС → Основной договор |
| `subject_of` | equipment → contract | — | Оборудование → Договор |
| `subject_of` | act → contract | — | Акт → Договор |
| `located_in` | equipment → room | — | Оборудование → Помещение |
| `located_on` | building → land_plot | — | Здание → Зем. участок |

**✅ Правило: если значение — ссылка на другую сущность → это relation.**

### 4. Таблица `entity_type_fields` / `field_definitions` — метаданные полей
Определяет, какие поля есть у каждого типа сущности, их тип (text, number, select, date), опции, порядок.

---

## ❌ Что ЗАПРЕЩЕНО хранить в properties

| Запрещено | Почему | Правильно |
|-----------|--------|-----------|
| `contractor_name` | Копия имени, устаревает | JOIN через relation `contractor` |
| `contractor_id` | Связь, не атрибут | relation type=`contractor` |
| `our_legal_entity` | Копия имени | JOIN через relation `our_entity` |
| `our_legal_entity_id` | Связь, не атрибут | relation type=`our_entity` |
| `subtenant_name` | Копия имени | JOIN через relation `subtenant` |
| `subtenant_id` | Связь, не атрибут | relation type=`subtenant` |
| `equipment_name` | Копия имени | JOIN через relation |
| Любой `*_name` где есть `*_id` | Дубль | Резолвить JOIN-ом |

---

## Как получать имена связанных сущностей

### В SQL (backend, reports.js):
```sql
SELECT c.id, c.name, c.properties,
  contractor.name AS contractor_name,
  our_ent.name AS our_entity_name
FROM entities c
LEFT JOIN relations r_contr ON r_contr.from_entity_id = c.id 
  AND r_contr.relation_type = 'contractor' AND r_contr.deleted_at IS NULL
LEFT JOIN entities contractor ON contractor.id = r_contr.to_entity_id
LEFT JOIN relations r_our ON r_our.from_entity_id = c.id 
  AND r_our.relation_type = 'our_entity' AND r_our.deleted_at IS NULL
LEFT JOIN entities our_ent ON our_ent.id = r_our.to_entity_id
WHERE c.entity_type_id = 5 AND c.deleted_at IS NULL;
```

### На фронтенде:
```javascript
// Загрузить все компании один раз
var companies = await apiGet('/api/entities?type=company&limit=9999');
var companyMap = {};
companies.forEach(function(c) { companyMap[c.id] = c.name; });

// Резолвить по relation
var contractorRel = entity.relations.find(r => r.relation_type === 'contractor');
var contractorName = contractorRel ? companyMap[contractorRel.to_entity_id] : '—';
```

---

## Форма создания/редактирования

При выборе контрагента в форме:
1. Пользователь выбирает компанию из searchable-select (по ID)
2. При сохранении создаётся **relation** (не записывается в properties)
3. При загрузке формы — relation читается и подставляется в селект

---

## Правила для разработчиков (агентов)

### При создании нового типа сущности:
1. Определить **собственные атрибуты** → field_definitions + properties
2. Определить **связи с другими сущностями** → новые relation_type в relations
3. **Никогда** не дублировать имя связанной сущности в properties

### При добавлении нового поля:
- Это ссылка на другую сущность? → **relation**
- Это собственное свойство? → **properties**
- Это вычисляемое значение? → **не хранить**, вычислять на лету

### При написании отчётов/API:
- Имена компаний, оборудования, помещений → **JOIN через relations**
- Собственные атрибуты (суммы, даты, статусы) → **из properties**
- **Никогда** не читать `*_name` из properties — только JOIN

### При рефакторинге:
- Нашёл `properties->>'xxx_name'` → заменить на JOIN
- Нашёл `properties->>'xxx_id'` → мигрировать в relation, убрать из properties

---

## План миграции (текущее состояние → целевое)

### Фаза 1: Добавить role в relations
Сейчас `party_to` не различает contractor/our_entity/subtenant.
→ Мигрировать на отдельные relation_type: `contractor`, `our_entity`, `subtenant`

### Фаза 2: Заполнить relations из properties
Для каждого договора/ДС:
- `properties->>'contractor_id'` → relation type=`contractor`
- `properties->>'our_legal_entity_id'` → relation type=`our_entity`  
- `properties->>'subtenant_id'` → relation type=`subtenant`

### Фаза 3: Обновить бэкенд
- reports.js — заменить `properties->>'contractor_name'` на JOIN через relations
- API entities — включать relations в ответ

### Фаза 4: Обновить фронтенд
- Формы: сохранять выбор компании как relation, не в properties
- Карточки: читать связи из relations, не из properties
- Списки: JOIN или preload

### Фаза 5: Очистка
- Удалить `contractor_id`, `contractor_name`, `our_legal_entity_id`, `our_legal_entity`, `subtenant_id`, `subtenant_name` из properties
- Удалить старые `party_to` relations (заменены на типизированные)

---

*Этот документ — закон проекта. Все новые фичи должны следовать этим правилам.*
*Создан: 2026-03-09*
