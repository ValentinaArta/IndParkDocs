# Деплой и инфраструктура IndParkDocs

## Где живёт сайт

Сайт перенесён с Render.com на **Hetzner VPS (89.167.75.91)**.

- **Код:** `/root/workspace-indparkdocs/`
- **Systemd сервис:** `indparkdocs` (автозапуск, автоперезапуск при падении)
- **Порт:** 3002 (localhost)
- **Публичный доступ:** https://89.167.75.91:3335 (самоподписанный сертификат)
- **Скоро:** https://docs.zvezda-park.com (Let's Encrypt, ждём DNS)

## База данных

PostgreSQL в Docker на том же сервере:
- **Host:** 127.0.0.1:5432
- **Database:** indparkdocs
- **User:** indpark / indpark2026
- **Подключение:** `docker exec postgres psql -U indpark -d indparkdocs`

## Как деплоить изменения

```bash
# 1. Внести изменения в код
# 2. Проверить синтаксис
node --check server/src/index.js

# 3. Перезапустить сервис
systemctl restart indparkdocs

# 4. Проверить что работает
systemctl status indparkdocs
curl -s http://127.0.0.1:3002/api/health
```

## Логи

```bash
journalctl -u indparkdocs -f          # в реальном времени
journalctl -u indparkdocs -n 50       # последние 50 строк
```

## Env переменные

Хранятся в systemd сервисе `/etc/systemd/system/indparkdocs.service`:
- `NODE_ENV=production`
- `PORT=3002`
- `DATABASE_URL=postgresql://indpark:indpark2026@127.0.0.1:5432/indparkdocs`
- `DB_SSL=false`
- `FORCE_HTTPS=false`
- `JWT_SECRET=indpark-jwt-secret-2026-march`
- `CORS_ORIGINS=...` (список разрешённых origin)

После изменения env:
```bash
systemctl daemon-reload
systemctl restart indparkdocs
```

## Доступ к 1С OData

1С находится в локальной сети Звезды (192.168.2.3). Для доступа нужен VPN-туннель:

```bash
# Поднять туннель
echo "c zvezda" > /var/run/xl2tpd/l2tp-control
sleep 8
ip route add 192.168.2.0/24 via 10.253.190.1 dev ppp0 2>/dev/null || true

# Проверить
ping -c 2 192.168.2.3

# URL 1С OData
http://192.168.2.3/BF/odata/standard.odata/
# Логин: odata.user / gjdbh2642!
```

⚠️ Туннель поднимается вручную и не переживает перезагрузку сервера.

## Nginx

Конфиги:
- `/etc/nginx/sites-available/indparkdocs-https` — текущий (IP:3335 с HTTPS)
- `/etc/nginx/sites-available/indparkdocs-domain` — для docs.zvezda-park.com (готов, ждёт DNS)

Перезагрузить nginx: `systemctl reload nginx`

## Render.com

Пока оставлен как резерв. URL: https://indparkdocs.onrender.com  
Когда docs.zvezda-park.com заработает и всё проверено — можно отключить Render.

## Git

```bash
cd /root/workspace-indparkdocs
git status
git log --oneline -5
```

Репозиторий: https://github.com/ValentinaArta/IndParkDocs
