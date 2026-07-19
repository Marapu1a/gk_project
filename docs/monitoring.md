# Мониторинг и диагностика

Проект использует лёгкую схему мониторинга без отдельного observability-стека:

- Fastify/Pino пишет структурированные JSON-логи в stdout контейнера;
- `GET /health` проверяет PostgreSQL, upload-хранилище и ежедневную задачу сертификатов;
- Docker Compose отмечает backend как `healthy`/`unhealthy`;
- Docker ограничивает локальные логи пятью файлами по 10 МБ;
- Sentry опционально принимает backend/frontend ошибки, если заданы DSN.

## Health endpoint

Внутри контейнера endpoint доступен как:

```text
http://127.0.0.1:3000/health
```

Снаружи через production nginx:

```text
https://account.reestrpap.ru/api/health
```

Успешный ответ имеет HTTP 200:

```json
{
  "status": "ok",
  "timestamp": "2026-07-19T12:00:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": "ok",
    "storage": { "status": "ok", "freeMb": 10240 },
    "certificateLifecycleScheduler": {
      "status": "ok",
      "lastAttemptAt": "2026-07-19T11:00:00.000Z",
      "lastSuccessAt": "2026-07-19T11:00:00.000Z"
    }
  }
}
```

HTTP 503 означает одно из следующего:

- Prisma не может выполнить `SELECT 1`;
- каталог uploads недоступен для чтения/записи;
- на диске осталось меньше `UPLOAD_MIN_FREE_MB` (по умолчанию 256 МБ);
- ежедневная задача сертификатов завершилась ошибкой или не выполнялась более 26 часов.

Endpoint не возвращает внутренний текст ошибки, путь хранилища или параметры подключения к БД.

## Быстрая проверка production

```bash
curl -i https://account.reestrpap.ru/api/health
docker compose ps
docker compose logs --tail=100 backend
```

Подробное состояние healthcheck контейнера:

```bash
docker inspect --format='{{json .State.Health}}' "$(docker compose ps -q backend)"
```

Проверка backend изнутри контейнера:

```bash
docker compose exec backend node -e "fetch('http://127.0.0.1:3000/health').then(async r=>{console.log(r.status, await r.text())})"
```

## Логи

Последние сообщения:

```bash
docker compose logs --tail=200 backend
docker compose logs --tail=200 db
docker compose logs --tail=200 frontend
```

Наблюдение в реальном времени:

```bash
docker compose logs -f --tail=100 backend
```

Ошибки критических операций содержат поля `operation`, `reqId`/`requestId` и `err`:

```bash
docker compose logs --since=24h backend | grep -E '"level":(50|60)|failed|unhandled_request'
docker compose logs --since=24h backend | grep 'document_review_admin_notification'
docker compose logs --since=24h backend | grep 'certificate_preview'
docker compose logs --since=24h backend | grep 'certificate_lifecycle_scheduler'
```

Если пользователь прислал `requestId`, найти запрос можно так:

```bash
docker compose logs --since=24h backend | grep 'REQUEST_ID_ИЗ_ОШИБКИ'
```

## PostgreSQL

Проверка готовности:

```bash
docker compose exec db pg_isready -U postgres -d cspap
```

Простой запрос:

```bash
docker compose exec db psql -U postgres -d cspap -c 'SELECT 1;'
```

Размер базы:

```bash
docker compose exec db psql -U postgres -d cspap -c "SELECT pg_size_pretty(pg_database_size('cspap'));"
```

## Upload-хранилище и диск

```bash
docker compose exec backend sh -c 'df -h /app/uploads && ls -ld /app/uploads'
docker compose exec backend node -e "require('fs').access('/app/uploads',require('fs').constants.R_OK|require('fs').constants.W_OK,e=>{if(e)throw e;console.log('uploads: ok')})"
```

Отсутствие файла на диске само по себе не считается аварией: документы и сертификаты могут быть намеренно удалены или заменены, а историческая запись остаётся. Проверять нужно конкретную пользовательскую операцию и её статус.

## Sentry

Sentry полностью выключен, пока переменные не заданы. Replay, tracing, отправка логов и default PII не включены.

Backend (`backend/.env`):

```dotenv
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=
```

Frontend получает публичный DSN при Docker-сборке. Значения можно положить в корневой `.env`, который не коммитится:

```dotenv
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=
```

После появления Sentry-проектов нужно отдельно настроить загрузку production sourcemaps. Для неё потребуется `SENTRY_AUTH_TOKEN`, название организации и проекта; токен нельзя добавлять в репозиторий.

Для первоначального запуска достаточно двух проектов Sentry: Node.js для backend и
React для frontend. В каждом проекте стоит включить уведомления минимум для событий
`first seen` и `regression`; частотный порог имеет смысл добавить после недели
наблюдения, чтобы не получить поток ложных тревог. Канал доставки (email или
интеграция с рабочим мессенджером) настраивается в самом Sentry, а не в приложении.

## Что считать тревогой

Немедленной проверки требуют:

- `unhandled_request` и любой 5xx критической ручки;
- `*_notification failed` после успешной основной операции;
- `certificate_preview_*`;
- `certificate_lifecycle_scheduler`;
- `password_reset_email` и `transborder_consent_email`;
- сетевые/5xx ошибки frontend при POST/PUT/PATCH/DELETE.

Одиночные 400/403/409/413/415 обычно являются ожидаемыми отказами. Пороговые алерты для них и для возраста рабочих очередей следует включать после недели наблюдения за production-базовой частотой.

## После деплоя

```bash
git pull
docker compose up --build -d
docker compose ps
curl -i https://account.reestrpap.ru/api/health
docker compose logs --tail=100 backend
```

Если backend стал `unhealthy`, сначала смотрим ответ `/health`, затем backend/db логи и свободное место. Healthcheck отмечает проблему, но сам по себе не перезапускает исправно работающий процесс и не заменяет внешнее оповещение.
