# Codex Code Review — 2026-02-27

**Модель:** gpt-5.2-codex (Codex CLI v0.104.0)
**Режим:** read-only sandbox, full codebase review
**Проверено:** server/src/ (все routes, middleware, migrations, index.js)

---

## Findings

### [P1] HIGH — Refresh tokens не отзываются при смене пароля
**Файл:** `server/src/routes/auth.js:80-91`

При смене пароля (`change-password`) существующие refresh tokens остаются валидными. Украденный refresh token может продолжать генерировать access tokens даже после смены пароля.

**Рекомендация:** После обновления пароля удалить все refresh tokens для `req.user.id`, чтобы старые сессии были принудительно завершены.

---

### [P2] MEDIUM — Выбор последнего дополнения по ID вместо даты
**Файл:** `server/src/routes/reports.js:755-774`

В отчёте area-stats "последнее" дополнение (supplement) с rent_objects выбирается перебором по `e.id`. Если дополнения вставлены не в хронологическом порядке (импорт, бэкфилл), может быть выбран не последний по дате документ, что исказит метрики арендуемых площадей.

**Рекомендация:** Сортировать по `contract_date` (с id как tiebreaker) или сравнивать даты перед перезаписью `latest`.

---

### [P3] LOW — Утечка деталей БД в health endpoint
**Файл:** `server/src/routes/health.js:6-11`

Неаутентифицированный health endpoint возвращает `e.message` при ошибке подключения к БД. Это может раскрыть внутренние хостнеймы или детали драйвера.

**Рекомендация:** Возвращать generic error message в production.

---

## Итого

| Уровень | Количество |
|---------|-----------|
| CRITICAL | 0 |
| HIGH | 1 |
| MEDIUM | 1 |
| LOW | 1 |

**Общая оценка Codex:** Кодовая база в целом хорошо структурирована. SQL-запросы параметризованы, XSS-очистка на месте, валидация через Joi, audit logging присутствует. Основная проблема — refresh tokens при смене пароля.
