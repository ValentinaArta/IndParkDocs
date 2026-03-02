# План: Конструктор отчётов (OLAP Cube) для IndParkDocs

**Статус:** Одобрен, ожидает запуска
**Дата:** 2026-02-27
**Ветка:** dev

---

## Шаг 1. Materialized View `cube_facts` (бэкенд, БД)

Денормализованная таблица — одна строка = один факт (помещение в договоре / единица оборудования).

**Поля:**
- `contract_id`, `contract_name`, `contract_type`, `contract_date`
- `contractor_name`, `our_legal_entity`
- `building_id`, `building_name`, `room_name`
- `area` (numeric), `monthly_amount` (numeric)
- `equipment_id`, `equipment_name`, `equipment_count`
- `source_entity_id` (для drill-down)

**Refresh:** При изменении entities → `REFRESH MATERIALIZED VIEW CONCURRENTLY` (нужен unique index).

**Миграция:** 023.

## Шаг 2. API endpoint `/api/reports/cube` (бэкенд)

**Запрос:**
```json
{
  "rows": ["contractor_name"],
  "cols": ["building_name"],
  "measure": "area",
  "aggregation": "sum",
  "filters": { "contract_type": ["Аренды"] }
}
```

**Ответ:**
```json
{
  "rowLabels": ["ООО Рога", "ИП Иванов"],
  "colLabels": ["Корпус А", "Корпус Б"],
  "data": [[450, 120], [200, null]],
  "totals": { "rows": [570, 200], "cols": [650, 120], "grand": 770 }
}
```

**Drill-down endpoint** `/api/reports/cube/drill` — возвращает список entity_id + name + details для координат ячейки.

## Шаг 3. Фронтенд — UI конструктора

- Dropdown "Строки" / "Столбцы" / "Значения" / "Агрегация"
- Кнопка "Построить"
- Фильтры (тип договора, период, корпус)
- Таблица в стиле IndParkDocs UI
- Строка/столбец ИТОГО
- Подсветка при наведении, опционально heatmap

## Шаг 4. Drill-down

- Клик на ячейку → запрос `/api/reports/cube/drill`
- Modal со списком документов (название, детали)
- Клик на документ → карточка entity
- Клик на ИТОГО → drill-down по всей строке

## Шаг 5. Шаблоны + Экспорт

- Таблица `report_templates` (user_id, name, config JSON)
- Сохранение/загрузка шаблонов
- 3-5 предустановленных шаблонов
- Экспорт Excel (exceljs) + PDF

## Оценка: 14-19 часов

| Шаг | Часы |
|-----|------|
| 1. Materialized view | 2-3 |
| 2. API endpoints | 3-4 |
| 3. Фронтенд | 4-5 |
| 4. Drill-down | 2-3 |
| 5. Шаблоны + экспорт | 3-4 |

## Критерии приёмки

- [ ] Выбор строк/столбцов/метрики из dropdown
- [ ] Таблица строится за <2 сек
- [ ] Drill-down: ячейка → документы → карточка
- [ ] ИТОГО по строкам и столбцам
- [ ] Сохранение/загрузка шаблонов
- [ ] Экспорт в Excel
- [ ] Мобильная версия читаема
