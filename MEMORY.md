# MEMORY.md — Долгосрочная память

## Проект
- **IndParkDocs** — система документов и связей для индустриального парка
- Репо: https://github.com/ValentinaArta/IndParkDocs.git (ветки: main, dev)
- Продакшн: https://indparkdocs.onrender.com (Render free tier, спит без запросов)
- Логин: admin / 123456
- Стек: Node.js + Express + PostgreSQL + inline SPA (без сборки)
- Деплой: push в main → автодеплой Render (~2 мин)

## Пользователь
- Валентина (ValentinaArta на GitHub)
- Общение на русском
- Не программист — объяснять простым языком
- Любит когда я сам слежу за деплоем и пишу только когда готово

## Ключевые технические решения

### Миграции БД
- НЕ запускать из Procfile (нет DATABASE_URL при старте)
- Встраивать в index.js при старте сервера (runMigration003)
- Всегда использовать ON CONFLICT DO NOTHING / DO UPDATE

### CI
- GitHub Actions: .github/workflows/ci.yml
- npm ci (не npm install) — нужен синхронизированный package-lock.json
- Проверяет синтаксис + frontend JS через new Function()

### Frontend JS
- Вся логика инлайн в frontend.js, отдаётся как HTML
- Проверять синтаксис: node -e "new Function('async function __t(){' + m[1] + '}')"
- Опасные конструкции: catch {} без параметра, function f(expr()) в объявлении

### Git workflow
- feature/task → dev → (PR) → main → автодеплой
- После каждого пуша: мержить оба бранча, ждать деплой, проверять

## Архитектура данных
- Все сущности в таблице entities (contracts, companies, buildings, rooms, equipment...)
- Связи через таблицу relations (party_to, located_in, supplement_to)
- Компании: is_own=true → наши юрлица, false → контрагенты (одна таблица)
- Договоры хранят и entity ID (contractor_id) и имя (contractor_name)

## Что реализовано (по состоянию на 2026-02-23)
- Создание/редактирование договоров (подряд, аренда, субаренда, услуги...)
- Доп. соглашения с полем "что поменялось"
- Форма аренды: множественные объекты, авторасчёт аренды, НДС 22%, комментарии
- Entity selectors (наше юрлицо, контрагент, корпус, помещение) — с созданием inline
- Автосоздание relations при сохранении договора
- Страница "Отчёты" (pivot по любому полю, работает по properties)
