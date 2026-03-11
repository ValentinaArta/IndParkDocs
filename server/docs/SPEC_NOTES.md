# Спецификация: Заметки (Notes)

## Назначение
Страница-блокнот для создания заметок с iPad, поддерживающая:
- Текстовые блоки (contenteditable)
- Рисунок от руки стилусом (Canvas + Pointer Events)
- Вставку изображений из буфера обмена (Clipboard API)
- Автосохранение (debounce 3 сек)

## Модель данных

### Таблица `notes`
| Поле | Тип | Описание |
|------|-----|----------|
| id | SERIAL PK | |
| title | VARCHAR(500) | Название заметки (по умолчанию "Новая заметка") |
| content_json | JSONB | Массив блоков: `[{type, value/dataUrl}]` |
| created_by | INTEGER FK → users(id) | Автор |
| created_at | TIMESTAMPTZ | Дата создания |
| updated_at | TIMESTAMPTZ | Дата последнего изменения |

### Типы блоков в content_json
```json
[
  { "type": "text", "value": "Текст заметки..." },
  { "type": "drawing", "dataUrl": "data:image/png;base64,..." },
  { "type": "image", "dataUrl": "data:image/png;base64,..." }
]
```

## API

### `GET /api/notes`
- **Auth**: Bearer token (обязательно)
- **Response**: `[{id, title, updated_at, created_at}]` — список заметок текущего пользователя, отсортированный по updated_at DESC
- Возвращает только заметки `created_by = req.user.id`

### `GET /api/notes/:id`
- **Auth**: Bearer token
- **Response**: полный объект заметки включая content_json
- **404**: если заметка не найдена или принадлежит другому пользователю

### `POST /api/notes`
- **Auth**: Bearer token
- **Body**: `{ title?: string, content_json?: Block[] }`
- **Response**: созданная заметка (RETURNING *)
- Defaults: title="Новая заметка", content_json=[]

### `PUT /api/notes/:id`
- **Auth**: Bearer token
- **Body**: `{ title?: string, content_json?: Block[] }`
- **Response**: `{id, title, updated_at}`
- Обновляет только переданные поля (COALESCE)
- Автоматически обновляет updated_at
- **404**: если не найдена / чужая

### `DELETE /api/notes/:id`
- **Auth**: Bearer token
- **Response**: `{ok: true}`
- **404**: если не найдена / чужая

## Безопасность
- Все эндпоинты требуют аутентификации (middleware `authenticate`)
- Пользователь видит/редактирует/удаляет только свои заметки (WHERE created_by = user.id)
- JSON body limit: 10MB (для data-url изображений)
- Стандартный 1MB limit для остального API не затрагивается

## UI (Frontend)

### Навигация
- Пункт «Заметки» в сайдбаре (секция перед «Настройки»)
- Иконка: Lucide `notebook-pen`
- Hash: `#notes`

### Layout
- Левая панель (260px): список заметок + кнопка «Новая заметка»
- Правая панель: редактор блоков

### Редактор
- Заголовок заметки: input с автосохранением
- Блоки текста: contenteditable div
- Блоки рисунка: canvas с toolbar (ручка, ластик, цвет, толщина, очистить)
- Блоки изображений: readonly img
- Кнопки добавления блоков: «Текст», «Рисунок»
- Кнопка удаления на каждом блоке (×)
- Вставка изображений: Ctrl+V / Cmd+V в текстовом блоке

### Рисование
- Pointer Events API (стилус, палец, мышь)
- Поддержка давления пера (pressure-sensitive line width)
- High DPI: canvas масштабируется по devicePixelRatio
- Сохранение: canvas → PNG data-url при pointerup
- Инструменты: ручка (source-over), ластик (destination-out)

### Автосохранение
- Debounce: 3 секунды после последнего изменения
- Индикатор «Сохранение...» / «Сохранено» (fixed bottom-right)
- Сохранение перед переключением на другую заметку

## Миграция
- `057_notes.js`: CREATE TABLE notes + индексы (created_by, updated_at DESC)

## Файлы
| Файл | Назначение |
|------|-----------|
| `server/src/migrations/057_notes.js` | Миграция БД |
| `server/src/routes/notes.js` | CRUD API |
| `server/src/frontend/pages/notes-page.js` | UI страницы |
| `server/src/frontend/layout.js` | Пункт сайдбара |
| `server/src/frontend/pages/nav.js` | Hash-роутинг `#notes` |
| `server/src/frontend/index.js` | Подключение модуля |
| `server/src/index.js` | Регистрация роута + 10MB JSON limit |
