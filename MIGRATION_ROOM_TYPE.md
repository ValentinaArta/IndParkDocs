# Миграция: object_type → room_type + упрощение rent_objects

## Шаг 1. Переименовать object_type → room_type в properties rooms

```sql
-- Добавить room_type, скопировать из object_type
UPDATE entities SET properties = properties || jsonb_build_object('room_type', properties->>'object_type')
WHERE entity_type_id = (SELECT id FROM entity_types WHERE name='room')
AND deleted_at IS NULL AND properties->>'object_type' IS NOT NULL AND properties->>'object_type' != '';

-- Цех РЭС (id=133) — заполнить вручную
UPDATE entities SET properties = properties || '{"room_type": "Производство класс В"}'
WHERE id = 133;

-- Удалить старое поле object_type
UPDATE entities SET properties = properties - 'object_type'
WHERE entity_type_id = (SELECT id FROM entity_types WHERE name='room') AND deleted_at IS NULL;
```

## Шаг 2. Добавить room_type в field_definitions

```sql
INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, options, sort_order)
SELECT id, 'room_type', 'Тип помещения', 'select', 
  '["Производство класс В", "Производство класс С", "Склад", "Офис", "АБК"]', 3
FROM entity_types WHERE name='room';
```

## Шаг 3. Упростить rent_objects в договорах

Оставить только: room_id, rent_rate, comment.
При отображении подтягивать из room: name, area, room_type, parent_id (корпус).

⚠️ Договор id=8 (РЭС Инжиниринг) — 2 объекта без room_id, нужно создать rooms или оставить as-is.

## Шаг 4. Фронтенд — изменить renderDynamicFields для аренды
