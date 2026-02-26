# ER-схема IndParkDocs

> Актуально на: 2026-02-26  
> Миграции: 003–016

---

## Структура таблиц БД

```mermaid
erDiagram
    entity_types {
        int    id          PK
        string name        UK
        string name_ru
        string icon
        string color
        int    sort_order
    }
    field_definitions {
        int    id               PK
        int    entity_type_id   FK
        string name
        string name_ru
        string field_type
        jsonb  options
        bool   required
        int    sort_order
    }
    entities {
        int       id              PK
        int       entity_type_id  FK
        string    name
        jsonb     properties
        int       parent_id       FK
        timestamp created_at
        timestamp deleted_at
    }
    relation_types {
        int    id      PK
        string name    UK
        string name_ru
        string color
    }
    relations {
        int       id              PK
        int       from_entity_id  FK
        int       to_entity_id    FK
        string    relation_type   FK
        timestamp created_at
    }
    users {
        int    id            PK
        string username      UK
        string password_hash
    }

    entity_types    ||--o{ entities         : "тип сущности"
    entity_types    ||--o{ field_definitions : "поля типа"
    entities        }o--o| entities         : "parent_id"
    relation_types  ||--o{ relations        : "тип связи"
    entities        ||--o{ relations        : "from_entity_id"
    entities        ||--o{ relations        : "to_entity_id"
```

---

## Доменная схема — сущности и связи

```mermaid
graph TD
    %% ─── ТЕРРИТОРИЯ ───────────────────────────────
    LP["🌍 Земельный участок<br/>─────────────────<br/>кадастровый номер<br/>площадь га<br/>разрешённое использование"]
    LPP["🗺 Часть ЗУ<br/>─────────────────<br/>описание<br/>площадь га"]
    BLD["🏢 Корпус<br/>─────────────────<br/>адрес<br/>общая площадь м²<br/>собственник →company"]
    RM["🚪 Помещение<br/>─────────────────<br/>тип помещения<br/>площадь м²<br/>этаж"]
    EQ["⚙️ Оборудование<br/>─────────────────<br/>категория<br/>вид<br/>инв. номер<br/>серийный номер<br/>год / производитель<br/>статус<br/>собственник →company"]

    %% ─── КОМПАНИИ ─────────────────────────────────
    CO["🏛 Компания<br/>─────────────────<br/>is_own (наше/стороннее)<br/>ИНН<br/>контактное лицо<br/>телефон / email"]

    %% ─── ДОКУМЕНТЫ ────────────────────────────────
    CT["📄 Договор<br/>─────────────────<br/>тип (Аренды/Подряда/…)<br/>номер / дата / срок до<br/>наше юрлицо →company<br/>контрагент →company<br/>НДС %"]
    SP["📎 Доп. соглашение<br/>─────────────────<br/>тип (нас-ся от договора)<br/>номер / дата<br/>что поменялось<br/>(parent_id = договор)"]
    ACT["📝 Акт<br/>─────────────────<br/>номер / дата<br/>позиции [{оборудование,<br/>сумма, описание}]<br/>итого ₽<br/>комментарий<br/>(parent_id = договор)"]
    ORD["📜 Приказ<br/>─────────────────<br/>номер / дата<br/>тип (консервация/…)<br/>кем выдан"]

    %% ─── parent_id иерархия ───────────────────────
    LP  -->|"parent"| LPP
    BLD -->|"parent (Собственник)"| CO
    BLD -->|"parent"| RM
    EQ  -->|"parent (иерархия)"| EQ
    CT  -->|"parent"| SP
    CT  -->|"parent"| ACT

    %% ─── Связи (relations table) ──────────────────
    BLD -.->|"located_on"| LP
    EQ  -.->|"located_in"| BLD
    EQ  -.->|"located_in"| RM
    CO  -.->|"party_to"| CT
    EQ  -.->|"subject_of"| CT
    RM  -.->|"subject_of"| CT
    EQ  -.->|"subject_of"| ACT
    SP  -.->|"supplement_to"| CT
    ACT -.->|"supplement_to"| CT
    EQ  -.->|"on_balance"| CO

    %% ─── Стили ────────────────────────────────────
    style LP  fill:#d1fae5,stroke:#10B981,color:#065f46
    style LPP fill:#a7f3d0,stroke:#059669,color:#065f46
    style BLD fill:#e0e7ff,stroke:#6366F1,color:#1e1b4b
    style RM  fill:#ede9fe,stroke:#A78BFA,color:#1e1b4b
    style EQ  fill:#fef3c7,stroke:#F59E0B,color:#78350f
    style CO  fill:#dbeafe,stroke:#3B82F6,color:#1e40af
    style CT  fill:#fee2e2,stroke:#EF4444,color:#7f1d1d
    style SP  fill:#ede9fe,stroke:#8B5CF6,color:#1e1b4b
    style ACT fill:#fef3c7,stroke:#F59E0B,color:#78350f
    style ORD fill:#e0e7ff,stroke:#6366F1,color:#1e1b4b
```

---

## Типы связей (relation_types)

| Название | Рус. | Направление |
|---|---|---|
| `located_in` | расположен в | оборудование → корпус / помещение |
| `located_on` | расположен на | корпус → земельный участок |
| `party_to` | сторона договора | компания → договор |
| `subject_of` | предмет договора | оборудование / помещение → договор / акт |
| `supplement_to` | дополнение к | доп.соглашение / акт → договор |
| `on_balance` | на балансе | оборудование → компания (собственник) |
| `rents` | арендует | компания → помещение (устар.) |
| `services` | обслуживает | компания → оборудование (устар.) |
| `installed_on` | установлен на | оборудование → подкрановый путь |

---

## Поля договора по типам (динамические)

| Тип | Дополнительные поля |
|---|---|
| **Аренды / Субаренды** | объекты аренды (помещения/площади/ставки), НДС, комментарии, срок, передача оборудования |
| **Подряда** | предмет, корпус, оборудование, сумма, авансы, срок выполнения |
| **Обслуживания** | описание работ, корпус, оборудование, стоимость, комментарий |
| **Услуг / Купли-продажи** | базовые поля договора |

---

## Иерархия parent_id

```
🌍 Земельный участок
  └─ 🗺 Часть ЗУ

🏢 Корпус (Собственник = наша компания)
  ├─ 🚪 Помещение
  └─ ⚙️ Оборудование
       └─ ⚙️ Оборудование (запчасть/узел)

📄 Договор
  ├─ 📎 Доп. соглашение
  └─ 📝 Акт
```

---

*Не показаны в меню (есть в БД): workshop 🏭, crane_track 🛤, document 📋*
