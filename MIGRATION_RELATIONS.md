# План миграции: связи из JSON properties → relations

## Текущее состояние
- 46 договоров, 45 с contractor_id, 46 с our_legal_entity_id, 4 с subtenant_id
- 194 relations типа `party_to` (97 contract→company + 97 supplement→company), **без указания роли**
- Фронтенд и бэкенд читают `properties->>'contractor_name'` и т.д.

## Целевое состояние
- Relations: `contractor`, `our_entity`, `subtenant` (вместо `party_to`)
- Properties: **без** `contractor_id/name`, `our_legal_entity/id`, `subtenant_id/name`
- Код: все имена компаний — через JOIN

---

## Миграция 040: Создание типизированных relations

```sql
-- Для каждого договора: contractor_id → relation type='contractor'
INSERT INTO relations (from_entity_id, to_entity_id, relation_type)
SELECT e.id, (e.properties->>'contractor_id')::int, 'contractor'
FROM entities e
JOIN entity_types t ON t.id = e.entity_type_id AND t.name IN ('contract', 'supplement')
WHERE e.deleted_at IS NULL
  AND e.properties->>'contractor_id' IS NOT NULL
  AND (e.properties->>'contractor_id')::int > 0
ON CONFLICT (from_entity_id, to_entity_id, relation_type) DO NOTHING;

-- our_legal_entity_id → relation type='our_entity'
INSERT INTO relations (from_entity_id, to_entity_id, relation_type)
SELECT e.id, (e.properties->>'our_legal_entity_id')::int, 'our_entity'
FROM entities e
JOIN entity_types t ON t.id = e.entity_type_id AND t.name IN ('contract', 'supplement')
WHERE e.deleted_at IS NULL
  AND e.properties->>'our_legal_entity_id' IS NOT NULL
  AND (e.properties->>'our_legal_entity_id')::int > 0
ON CONFLICT (from_entity_id, to_entity_id, relation_type) DO NOTHING;

-- subtenant_id → relation type='subtenant'
INSERT INTO relations (from_entity_id, to_entity_id, relation_type)
SELECT e.id, (e.properties->>'subtenant_id')::int, 'subtenant'
FROM entities e
JOIN entity_types t ON t.id = e.entity_type_id AND t.name IN ('contract', 'supplement')
WHERE e.deleted_at IS NULL
  AND e.properties->>'subtenant_id' IS NOT NULL
  AND (e.properties->>'subtenant_id')::int > 0
ON CONFLICT (from_entity_id, to_entity_id, relation_type) DO NOTHING;
```

## Миграция 041: Обновление бэкенда (reports.js + API)

### reports.js — заменить все `properties->>'contractor_name'`
Заменить:
```sql
e.properties->>'contractor_name' AS contractor_name
```
На:
```sql
LEFT JOIN relations r_contr ON r_contr.from_entity_id = e.id 
  AND r_contr.relation_type = 'contractor' AND r_contr.deleted_at IS NULL
LEFT JOIN entities contr ON contr.id = r_contr.to_entity_id
...
contr.name AS contractor_name
```

### API entities — включить relations в ответ
GET /api/entities/:id уже возвращает relations. Убедиться что включены типизированные.

## Фаза 3: Фронтенд

### contract-form.js
- Сохранение: вместо `properties.contractor_id` → создавать relation type=`contractor`
- Загрузка: читать relation и подставлять в searchable-select

### contract-card.js, supplement-card.js
- Имена компаний: из relations (entity.relations → find by type → companyMap)

### entity-list.js
- Preload компаний, резолвить по relations

## Фаза 4: Очистка properties

**Только после полного перехода фронта и бэка!**
```sql
UPDATE entities SET properties = properties 
  - 'contractor_id' - 'contractor_name' 
  - 'our_legal_entity_id' - 'our_legal_entity'
  - 'subtenant_id' - 'subtenant_name'
WHERE entity_type_id IN (5, 9);
```

## Порядок выполнения
1. ✅ ARCHITECTURE.md — правила (этот документ)
2. Миграция 040 — создать relations из properties (данные в двух местах временно)
3. Бэкенд — перевести reports.js на JOIN через relations
4. Фронтенд — формы и карточки через relations
5. Тесты — проверить всё
6. Очистка — удалить дублирующие поля из properties
7. Удалить старые `party_to` relations

## ⚠️ Важно
- Шаги 2-4 выполняются **параллельно**: данные одновременно в properties И relations
- Шаг 6 (очистка) — **только после** полного перевода кода
- Старые `party_to` — не удалять до завершения всех фаз
- Каждый шаг — отдельная feature-ветка, PR, тесты

*Создан: 2026-03-09*
