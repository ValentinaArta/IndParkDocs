# Спецификация: Скрытие сайдбара + полноэкранный режим заметок

## Назначение
1. **Все страницы**: кнопка в topbar для скрытия/показа сайдбара на desktop (≥769px)
2. **Заметки**: полноэкранный режим — скрывает сайдбар + topbar, максимум пространства для рисования/письма

## 1. Глобальный toggle сайдбара (desktop)

### Поведение
- На desktop (≥769px) сайдбар виден по умолчанию (260px)
- Кнопка ☰ в topbar переключает видимость сайдбара (уже есть, сейчас работает только на мобильных)
- При скрытии: сайдбар получает `display:none`, `.main` занимает 100% ширины
- Состояние сохраняется в `localStorage('sidebarHidden')` — переживает перезагрузку
- На мобильных (≤768px) поведение не меняется (overlay-меню как сейчас)

### CSS
- Класс `.sidebar-hidden` на `.app`:
  - `.app.sidebar-hidden .sidebar { display: none }`
  - `.app.sidebar-hidden .main { width: 100% }`
- Медиа-запрос: класс работает только на `min-width: 769px`

### JS (nav.js)
- `toggleSidebar()`: на desktop — toggle класса `sidebar-hidden` на `.app` + сохранение в localStorage
- При загрузке: если `localStorage.sidebarHidden === 'true'` — добавить класс

## 2. Полноэкранный режим заметок

### Поведение
- Кнопка «Полный экран» (Lucide `maximize-2`) в toolbar заметки (рядом с заголовком)
- Скрывает: сайдбар, topbar, левую панель списка заметок
- Показывает: только редактор заметки на весь экран + плавающая кнопка выхода
- Кнопка выхода: Lucide `minimize-2`, fixed top-right
- ESC — выход из полноэкранного режима
- На мобильных: полноэкранный режим скрывает topbar и список заметок (сайдбар уже скрыт)

### CSS
- Класс `.notes-fullscreen` на `body`:
  - `.notes-fullscreen .sidebar { display: none !important }`
  - `.notes-fullscreen .topbar { display: none !important }`
  - `.notes-fullscreen #notesSidebar { display: none !important }`
  - `.notes-fullscreen #notesEditor { padding: 24px 48px }`
  - `.notes-fullscreen #noteContent { max-width: 1200px }`

### JS (notes-page.js)
- `_noteToggleFullscreen()`: toggle класса на body
- Кнопка ESC listener (keydown)
- При выходе со страницы заметок — автоматически снять fullscreen

## Затрагиваемые файлы

| Файл | Изменения |
|------|-----------|
| `server/src/frontend/css.js` | Классы `.sidebar-hidden`, `.notes-fullscreen` |
| `server/src/frontend/pages/nav.js` | `toggleSidebar()` логика desktop + localStorage |
| `server/src/frontend/pages/notes-page.js` | Кнопка fullscreen, `_noteToggleFullscreen()`, ESC |
| `server/src/frontend/layout.js` | Без изменений (кнопка ☰ уже есть) |

## Ограничения
- Полноэкранный режим — только для заметок (не browser Fullscreen API, а CSS-скрытие UI)
- localStorage — per-device, не синхронизируется между устройствами
