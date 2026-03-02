# HEARTBEAT.md

## AI Chat — проверять входящие вопросы
- Проверь `GET /api/ai/chat/pending` на https://docs.zvezda-park.com
- Если есть pending messages — обработай: пойми вопрос, выполни SQL если нужно, отправь ответ через `POST /api/ai/chat/respond`
- Авторизация: Bearer token (логин admin/123456 через POST /api/auth/login)
