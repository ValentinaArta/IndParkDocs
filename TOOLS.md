# TOOLS.md - Local Notes

## IndParkDocs — Новый сервер (март 2026)
- **URL**: https://docs.zvezda-park.com
- **IP**: 89.167.75.91 (ubuntu-4gb-hel1-2)
- **Порт**: 3002 (nginx → 127.0.0.1:3002)
- **БД**: PostgreSQL в Docker, `postgresql://indpark:indpark2026@127.0.0.1:5432/indparkdocs`
- **Деплой**: изменить файлы → `systemctl restart indparkdocs` (код в /root/workspace-indparkdocs)
- **Логин**: valentina / (пароль из БД, bcrypt)
- Доступ к Docker PostgreSQL: `docker exec $(docker ps -q --filter "name=postgres") psql -U postgres -d indparkdocs`

## 1С OData API

### Подключение
- **URL**: `http://192.168.2.3/BF/odata/standard.odata/` (через VPN)
- **Прокси**: `http://127.0.0.1:18801/BF/odata/standard.odata/` (nginx на сервере)
- **Авторизация**: Basic Auth, credentials в CREDENTIALS.md
- **⛔ ТОЛЬКО GET-запросы! Никаких POST/PUT/PATCH/DELETE!**

### Примеры запросов
```bash
# Список организаций
curl -s -u "odata.user:PASSWORD" "http://192.168.2.3/BF/odata/standard.odata/Catalog_Организации?$format=json&$select=Description,ИНН,КПП"

# Платежи за период
curl -s -u "odata.user:PASSWORD" "http://192.168.2.3/BF/odata/standard.odata/Document_ПоступлениеНаРасчетныйСчет?$format=json&$filter=Date gt datetime'2025-01-01T00:00:00'&$top=50"

# Основные средства
curl -s -u "odata.user:PASSWORD" "http://192.168.2.3/BF/odata/standard.odata/Catalog_ОсновныеСредства?$format=json&$select=Description,Ref_Key&$top=100"
```

### Ключевые объекты

**Справочники (Catalog_):**
- `Catalog_Организации` — юрлица группы (ИПЗ, ЭКЗ, КГ Гермес, СЦ Звезда и др.)
- `Catalog_Контрагенты` — арендаторы, поставщики
- `Catalog_ДоговорыКонтрагентов` — договоры (вкл. `_ИсторияПроцентныхСтавок`)
- `Catalog_ОсновныеСредства` — здания, земля, оборудование
- `Catalog_БанковскиеСчета` — р/с компаний
- `Catalog_Номенклатура` — услуги, товары
- `Catalog_Подразделения` / `Catalog_ПодразделенияОрганизаций` — ЦФО
- `Catalog_бит_СтатьиОборотов` — статьи бюджетов (БИТ.Финанс)
- `Catalog_бит_Бюджеты` — бюджеты
- `Catalog_СтатьиДвиженияДенежныхСредств` — статьи ДДС

**Документы (Document_):**
- `Document_РеализацияТоваровУслуг` — акты/реализация (аренда!)
- `Document_ПоступлениеТоваровУслуг` — входящие услуги/товары
- `Document_ПоступлениеНаРасчетныйСчет` — входящие платежи
- `Document_СписаниеСРасчетногоСчета` — исходящие платежи
- `Document_СчетНаОплатуПокупателю` — счета арендаторам
- `Document_АктСверкиВзаиморасчетов` — акты сверки
- `Document_бит_ФормаВводаБюджета` — бюджетные формы (БИТ.Финанс)
- `Document_бит_БюджетнаяОперация` — бюджетные операции

**Регистры:**
- `AccountingRegister_Хозрасчетный` — проводки (план счетов бухучёта!)
- `AccountingRegister_бит_Бюджетирование` — бюджетные проводки
- `AccumulationRegister_РеализацияУслуг` — обороты по услугам
- `AccumulationRegister_бит_ОборотыПоБюджетам` — обороты бюджетов
- `AccumulationRegister_бит_ДвиженияДенежныхСредств` — ДДС в бюджетировании
- `InformationRegister_РасчетНалогаНаИмущество` — налог на имущество
- `InformationRegister_РасчетЗемельногоНалога` — земельный налог
- `InformationRegister_ЦеныНоменклатуры` — прайс-лист

### OData-особенности (quirks)
- `$filter` по `Организация_Key` работает НЕ для всех сущностей — если ошибка, fetch all + фильтруй в коде
- `$metadata` EntityContainer пустой — норма для 1С OData
- `Контрагент_Key` в `$select` может ломать запросы `ПоступлениеНаРасчетныйСчет` — опускай
- Формат дат: `datetime'2025-01-01T00:00:00'`
- JSON: `$format=json`
- Пагинация: `$top=N&$skip=M`
- Кириллица в URL: кодируй через encodeURIComponent или используй curl (он справляется)
- Всего объектов: **1479** (полная база 1С)

### VPN-туннель
1С доступна только через L2TP/IPsec VPN до Звезда Парка.
Проверить туннель: `ip addr show ppp0`
Поднять если упал: `echo "c zvezda" > /var/run/xl2tpd/l2tp-control && sleep 8 && ip route add 192.168.2.0/24 via 10.253.190.1 dev ppp0`
