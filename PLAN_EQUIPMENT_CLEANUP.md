# План: Удаление legacy-кода оборудования

## Текущая архитектура (правильная)
- **Единственный источник**: таблица `contract_equipment (contract_id, equipment_id, rent_cost, sort_order)`
- **Каскад**: при сохранении ДС → добавление/удаление каскадируется на последующие ДС
- **Отображение**: `own_equipment_list` в contract-card API
- **Наследование в форме**: из `own_equipment_list` родительского contract-card

## Что нужно удалить

### Фаза 1: Очистка `transfer_equipment` property (5 файлов)

**Проблема**: старый checkbox `transfer_equipment` в properties — дублирует факт наличия записей в `contract_equipment`.

| Файл | Строки | Что убрать |
|---|---|---|
| `server/src/routes/reports/contract-card.js` | 82-109 | Блок "4. Transfer equipment" — поиск ДС с `transfer_equipment=true` и чтение `contract_equipment`. Заменить: `transferEquipment` теперь берётся из `own_equipment_list`. |
| `server/src/frontend/rent-objects/room-block.js` | 18-19, 89-90 | Hidden checkbox `f_transfer_equipment` — не нужен, оборудование управляется через EquipmentSection в React. |
| `server/src/frontend/supplements.js` | 129-137 | Логика наследования `transfer_equipment` и `equipment_list` — заменена React EntityFormPage. |
| `server/src/frontend/forms/contract-form.js` | 102-107 | Чтение checkbox `f_transfer_equipment` при сохранении — не нужен. |
| `server/src/frontend/entities/supplement-card.js` | 275 | Чтение `sp.transfer_equipment` для отображения — заменено `own_equipment_list`. |

**Миграция**: `UPDATE entities SET properties = properties - 'transfer_equipment' WHERE properties ? 'transfer_equipment'` (55 записей)

**Удалить field_definition**: id из migration 052 (`transfer_equipment`, `equipment_list` fields)

### Фаза 2: Очистка `equipment_list` из properties (6 файлов старого SPA)

**Проблема**: старый SPA читает `equipment_list` из properties JSON — это дубликат `contract_equipment` таблицы.

| Файл | Строки | Что убрать |
|---|---|---|
| `server/src/frontend/entities/contract-card.js` | 302-320 | Секция "Переданное оборудование" — заменена React `own_equipment_list`. |
| `server/src/frontend/entities/supplement-card.js` | 277-279 | Парсинг `sp.equipment_list` JSON — заменён. |
| `server/src/frontend/entities/entity-detail.js` | 317-320 | Рендер `equipment_list` field_type — заменён. |
| `server/src/frontend/supplements.js` | 108, 129-136 | Наследование `equipment_list` в старом SPA — заменено React. |
| `server/src/frontend/forms/field-input.js` | 100, 188, 341 | `equipment_list` field_type обработка — заменена EquipmentSection. |
| `server/src/frontend/reports/pivot.js` | 5 | `equipment_list` в списке исключений — оставить (безвредно). |

### Фаза 3: Очистка `equipment_list` из бэкенда (entities.js)

| Файл | Строки | Что |
|---|---|---|
| `server/src/routes/entities.js` | 73 | `result.equipment_list = ceq` в `loadLineItems` — оставить (нужен для формы React). |
| `server/src/routes/entities.js` | 664-667 | `autoLinkEntities` — парсинг `equipment_list` из JSON для subject_of relations. **Проверить**: нужны ли subject_of relations для оборудования? Если нет — удалить. |

### Фаза 4: Очистка cube.js

| Файл | Строки | Что |
|---|---|---|
| `server/src/routes/cube.js` | 98-101 | Парсинг `transfer_equipment` JSON из properties для аналитики. Заменить: JOIN на `contract_equipment` таблицу. |

### Фаза 5: Очистка field_definitions

- Удалить `field_type = 'equipment_list'` из field_definitions (если есть)
- Удалить `transfer_equipment` из field_definitions (id=? в migration 052)
- Миграция: `DELETE FROM field_definitions WHERE name IN ('transfer_equipment') AND entity_type_id IN (5, 9)`

## Порядок выполнения

1. **Фаза 1** — самая важная. Убрать `transfer_equipment` property и всю логику вокруг него.
2. **Фаза 2** — только если старый SPA больше не используется для оборудования (React полностью заменил).
3. **Фаза 3** — после подтверждения что subject_of relations не нужны.
4. **Фаза 4** — при следующем рефакторинге cube.js.
5. **Фаза 5** — миграция БД, последний шаг.

## Риски

- Старый SPA (`/` без `/app/`) всё ещё используется некоторыми пользователями — фазы 2-3 ломают его.
- `equipment_list` в `loadLineItems` (строка 73) нужен для React формы — НЕ удалять.
- `contract-card.js` `equipment_list` (effectiveSrc) может использоваться для `equipment_rent_items` (аренда оборудования) — проверить перед удалением.

## Не трогать

- `contract_equipment` таблица — единственный источник, оставить.
- `own_equipment_list` в contract-card API — новый правильный путь.
- `cli_equipment_links` — привязка оборудования к позициям работ, отдельная сущность.
- `act_line_items.equipment_id` — связь акт↔оборудование, отдельная сущность.
