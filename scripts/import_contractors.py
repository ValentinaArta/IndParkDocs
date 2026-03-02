#!/usr/bin/env python3
"""
Импорт контрагентов из 1С OData в IndParkDocs как company-сущности.
Источники: Реализация, ПоступлениеТоваровУслуг, ПоступлениеНаРасчетныйСчет, СписаниеСРасчетногоСчета.
Хранит odata_ref_key в properties для надёжного матчинга.
Не перезаписывает уже существующие записи (idempotent).
"""

import subprocess, json, sys
import psycopg2

AUTH    = "odata.user:gjdbh2642!"
BASE    = "http://192.168.2.3/BF/odata/standard.odata"
ORG_IPZ = "1df6218d-8996-11e8-b18d-001e67301201"
DB_URL  = "postgresql://indpark:indpark2026@127.0.0.1:5432/indparkdocs"

def odata(path):
    r = subprocess.run(['curl','-s','--max-time','30','-u', AUTH, f'{BASE}/{path}'], capture_output=True)
    if r.returncode != 0:
        raise RuntimeError(f"curl error: {r.stderr.decode()}")
    return json.loads(r.stdout)

def odata_all(base_path, page=500):
    results, skip = [], 0
    while True:
        sep = '&' if '?' in base_path else '?'
        d = odata(f"{base_path}{sep}$top={page}&$skip={skip}")
        page_data = d.get('value', [])
        results += page_data
        if len(page_data) < page:
            break
        skip += page
    return results

# ─── Шаг 1: собираем уникальные Ref_Key из всех документов ИПЗ ───
print("Шаг 1. Собираем Ref_Key контрагентов из документов ИПЗ...")
org_filter = f"Организация_Key%20eq%20guid'{ORG_IPZ}'%20and%20Posted%20eq%20true"
keys = set()

sources = [
    ("РеализацияТоваровУслуг",       "Контрагент_Key"),
    ("ПоступлениеТоваровУслуг",      "Контрагент_Key"),
    ("ПоступлениеНаРасчетныйСчет",   "Контрагент_Key"),
    ("СписаниеСРасчетногоСчета",     "Контрагент_Key"),
    ("СчетНаОплатуПокупателю",       "Контрагент_Key"),
]

for doc_type, field in sources:
    try:
        docs = odata_all(f"Document_{doc_type}?$format=json&$filter={org_filter}&$select={field}")
        new = {x.get(field,'') for x in docs} - {'', '00000000-0000-0000-0000-000000000000'}
        keys |= new
        print(f"  {doc_type}: {len(docs)} doc → {len(new)} контрагентов")
    except Exception as e:
        print(f"  {doc_type}: ошибка — {e}")

print(f"\nИтого уникальных Ref_Key: {len(keys)}")

# ─── Шаг 2: загружаем полный каталог контрагентов ───
print("\nШаг 2. Загружаем Catalog_Контрагенты...")
cats = odata_all(
    "Catalog_Контрагенты?$format=json"
    "&$filter=DeletionMark%20eq%20false%20and%20IsFolder%20eq%20false"
    "&$select=Ref_Key,Description,НаименованиеПолное,ИНН,КПП,ЮридическоеФизическоеЛицо"
)
cat_map = {c['Ref_Key']: c for c in cats}
print(f"  Каталог: {len(cats)} записей (без удалённых и групп)")

# Оставляем только нужных
relevant = {k: cat_map[k] for k in keys if k in cat_map}
print(f"  Найдено в каталоге: {len(relevant)} из {len(keys)}")

# ─── Шаг 3: что уже есть в IndParkDocs ───
print("\nШаг 3. Проверяем IndParkDocs...")
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

# Ищем по odata_ref_key в properties
cur.execute("""
    SELECT e.properties->>'odata_ref_key' as ref_key, e.id, e.name
    FROM entities e
    JOIN entity_types et ON et.id = e.entity_type_id
    WHERE et.name = 'company'
      AND e.properties->>'odata_ref_key' IS NOT NULL
""")
existing_by_key = {row[0]: row[1] for row in cur.fetchall()}

# Также ищем по имени (нормализованному) для предотвращения дублей
cur.execute("""
    SELECT LOWER(TRIM(e.name)), e.id
    FROM entities e
    JOIN entity_types et ON et.id = e.entity_type_id
    WHERE et.name = 'company'
""")
existing_by_name = {row[0]: row[1] for row in cur.fetchall()}

print(f"  Уже в IndParkDocs по ref_key: {len(existing_by_key)}")
print(f"  Всего company-сущностей: {len(existing_by_name)}")

# Получаем entity_type_id для company
cur.execute("SELECT id FROM entity_types WHERE name='company'")
company_type_id = cur.fetchone()[0]

# ─── Шаг 4: импортируем новых ───
print("\nШаг 4. Импортируем...")

added, skipped_key, skipped_name = 0, 0, 0

for ref_key, c in relevant.items():
    name = (c.get('Description') or '').strip()
    if not name:
        continue

    # Уже есть по ref_key?
    if ref_key in existing_by_key:
        skipped_key += 1
        continue

    # Уже есть по имени?
    name_lower = name.lower().strip()
    if name_lower in existing_by_name:
        # Обновляем ref_key чтобы следующий запуск был idempotent
        eid = existing_by_name[name_lower]
        cur.execute("""
            UPDATE entities
            SET properties = properties || jsonb_build_object('odata_ref_key', %s::text)
            WHERE id = %s
        """, (ref_key, eid))
        skipped_name += 1
        continue

    # Создаём
    full_name = (c.get('НаименованиеПолное') or name).strip()
    inn = (c.get('ИНН') or '').strip()
    kpp = (c.get('КПП') or '').strip()
    le_type = c.get('ЮридическоеФизическоеЛицо', '')

    props = {
        'is_own': 'false',
        'odata_ref_key': ref_key,
        'full_name': full_name,
        'source': '1С',
    }
    if inn: props['inn'] = inn
    if kpp: props['kpp'] = kpp

    cur.execute("""
        INSERT INTO entities (entity_type_id, name, properties)
        VALUES (%s, %s, %s::jsonb)
    """, (company_type_id, name, json.dumps(props, ensure_ascii=False)))

    added += 1

conn.commit()
cur.close()
conn.close()

print(f"\n✅ Готово!")
print(f"  Добавлено новых:          {added}")
print(f"  Пропущено (есть по key):  {skipped_key}")
print(f"  Пропущено (есть по имени, обновлён ref_key): {skipped_name}")
print(f"  Итого обработано:         {len(relevant)}")
