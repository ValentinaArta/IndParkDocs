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
- **Dashboard "IndParkDocs — Обзор" ID**: 12
- **Публичная ссылка**: https://benthic-hull.metabaseapp.com/public/dashboard/17e56021-56da-4579-a085-e31dde6c0b7c

### Render API Key (добавлено 2026-02-26)
- **Ключ**: rnd_wcJfwhDQEtSWZGJDR6RjOOrHxJCP
- **Для чего**: управление Render (env vars, деплои, сервисы)
- **Service ID IndParkDocs**: srv-d6bg74ili9vc73dgo550

### IndParkDocs — JWT_SECRET
- **Значение**: k8Xp2mQ9vR4wZ7nB3jF6hT1yU5aE0cG8

### 1С OData — Бухгалтерская база (добавлено 2026-02-28)
- **URL**: `http://192.168.2.3/BF/odata/standard.odata/`
- **Nginx-прокси (localhost)**: `http://127.0.0.1:18801/BF/odata/standard.odata/`
- **Пользователь**: `odata.user` (⚠️ ТОЛЬКО ЧТЕНИЕ!)
- **Пароль**: `gjdbh2642!`
- **Доступ**: Только через VPN-туннель до Звезда Парка (192.168.2.3)
- **Объектов**: 1479 (практически вся база 1С)
- **⛔ ЗАПРЕЩЕНО**: POST, PUT, PATCH, DELETE — только GET-запросы!
- **⚠️ ЧУВСТВИТЕЛЬНОСТЬ**: Финансовая база реальных компаний. Не экспортировать, не логировать полные данные.

### IndParkDocs — Продакшн сервер (март 2026)
- **URL**: https://docs.zvezda-park.com
- **IP**: 89.167.75.91
- **Логин пользователя**: valentina / Val2026secure
- **БД**: postgresql://indpark:indpark2026@127.0.0.1:5432/indparkdocs (Docker)
- **Деплой**: `systemctl restart indparkdocs` (код в /root/workspace-indparkdocs)

### IndParkDocs — DATABASE_URL (Neon PostgreSQL) [DEPRECATED — перенесли на свой сервер март 2026]
```
postgresql://neondb_owner:npg_qbJf1MtSTDe8@ep-ancient-math-alg2359y-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require
```
- **Для чего**: Старая база данных IndParkDocs (Render, больше не используется)
- **Добавил**: 2026-02-26
