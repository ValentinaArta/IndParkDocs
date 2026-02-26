# CREDENTIALS.md — Secure Credentials Store

⚠️ Этот файл хранит все ключи, токены, доступы проекта.
Он НЕ удаляется при compact/restart. Всегда актуален.

## Правила
- При получении нового ключа/токена — СРАЗУ обнови этот файл
- При изменении пароля/URL — СРАЗУ обнови этот файл
- Никогда не удаляй старые записи — помечай как [DEPRECATED]
- Формат: название, значение, дата добавления, для чего используется

## Credentials

### Metabase Cloud (добавлено 2026-02-26)
- **URL**: https://benthic-hull.metabaseapp.com
- **Email**: valentinke@gmail.com
- **Пароль**: FPgCHlC6mo!DNyUG3VEJ3

### IndParkDocs — DATABASE_URL (Neon PostgreSQL, добавлено 2026-02-26)
```
postgresql://neondb_owner:npg_qbJf1MtSTDe8@ep-ancient-math-alg2359y-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require
```
- **Для чего**: Основная база данных IndParkDocs (DATABASE_URL в Render)
- **Хост**: ep-ancient-math-alg2359y-pooler.c-3.eu-central-1.aws.neon.tech
- **База**: neondb
- **Пользователь**: neondb_owner
- **Добавил**: 2026-02-26
