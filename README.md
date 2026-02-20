# IndParkDocs

[![CI](https://github.com/ValentinaArta/IndParkDocs/actions/workflows/ci.yml/badge.svg)](https://github.com/ValentinaArta/IndParkDocs/actions/workflows/ci.yml)

Система документов и связей для индустриального парка.

## Стек
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Frontend:** Inline SPA (без сборки)
- **Deploy:** Render

## Запуск локально

```bash
cd server
cp .env.example .env  # настроить DATABASE_URL
npm install
node src/migrate.js
node src/seed.js
node src/create-admin.js
node src/index.js
```

## Деплой
Push в `main` → автодеплой на Render.

🔗 https://indparkdocs.onrender.com
