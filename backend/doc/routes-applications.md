# 🧠 Backend README (ЦС ПАП)

Цель: обеспечить прозрачную структуру и документацию backend-части платформы Центра Сертификации по Прикладному Анализу Поведения.
Этот README служит основой для всех логик, реализованных и планируемых, и используется как навигационная карта при разработке.

---

## 📁 Структура директорий

- `auth/` — авторизация, JWT, сброс пароля
- `ceu/` — логика, связанная с CEU-баллами (создание, листинг, суммарный расчёт)
- `supervision/` — логика, связанная с супервизией (создание, листинг, суммарный расчёт)
- `certificate/` — выпуск и хранение сертификатов (в процессе реализации)

---

## 📦 Используемые модели (Prisma)

- `User` — пользователь платформы
- `CEURecord` + `CEUEntry` — "запись" и "атомарная строка" CEU-баллов
- `SupervisionRecord` + `SupervisionHour` — аналогично для часов супервизии
- `Group` + `UserGroup` — роли пользователей (Иерархия через `rank`)
- `Certificate` — выданный сертификат

---

## 📜 Статусы записей (`RecordStatus`)

- `UNCONFIRMED` — создана пользователем, ожидает модерации
- `CONFIRMED` — одобрена модератором / супервизором
- `REJECTED` — отклонена
- `SPENT` — учтена при сертификации, больше не участвует в расчётах

---

## ✅ CEU-логика

### 🔧 Определение роутов

```ts
app.post('/ceu/create', { preHandler: [verifyToken] }, createCeuHandler);
app.get('/ceu/list', { preHandler: [verifyToken] }, listCeuHandler);
app.get('/ceu/summary', { preHandler: [verifyToken] }, ceuSummaryHandler);
```

### POST `/ceu/create`

**Handler:** `createCeuHandler.ts`

**Назначение:** Создание CEU-записи и вложенных баллов.
Позволяет отправить файл, название события, дату и массив CEUEntry (категория + значение). Все записи создаются в статусе `UNCONFIRMED`.

**Валидация:** `createCeuSchema` (Zod)

**Ответ:**

```json
{ "success": true, "ceuRecord": { ... } }
```

**Ошибки:**

- 400 — некорректные данные

---

### GET `/ceu/list`

**Handler:** `listCeuHandler.ts`

**Назначение:** Получение всех записей CEU пользователя вместе с вложенными `CEUEntry`. Используется для отображения истории на фронте.

**Ответ:**

```json
{ "records": [ { id, eventName, entries: [...] } ] }
```

---

### GET `/ceu/summary`

**Handler:** `CEUsummary.ts`

**Назначение:** Подсчёт валидных (CONFIRMED) CEU-баллов пользователя по категориям.
Возвращает также процент выполнения требований для **следующего уровня**.

**Ответ:**

```json
{
  "required": { ethics, cultDiver, supervision, general } | null,
  "percent": { ethics, cultDiver, supervision, general } | null,
  "usable": { ethics, cultDiver, supervision, general }
}
```

**Логика:**

- Определяется **активная группа** по `UserGroup` с наивысшим `rank`
- Подсчитываются только `CEUEntry` со статусом `CONFIRMED`
- Если активная группа — последняя в иерархии, `required` и `percent` = `null`

**Требования к баллам по группам** зашиты в `requirementsByGroup`

**Ошибки:**

- 401 — не авторизован
- 404 — пользователь не найден

---

## ✅ Supervision-логика

### 🔧 Определение роутов

```ts
app.post('/supervision/create', { preHandler: [verifyToken] }, createSupervisionHandler);
app.get('/supervision/list', { preHandler: [verifyToken] }, listSupervisionHandler);
app.get('/supervision/summary', { preHandler: [verifyToken] }, supervisionSummaryHandler);
```

### POST `/supervision/create`

**Handler:** `createSupervisionHandler.ts`

**Назначение:** Создание записи супервизии и вложенных часов.
Каждая запись может содержать часы разных типов (INSTRUCTOR, CURATOR, SUPERVISOR). Все создаются в статусе `UNCONFIRMED`.

**Валидация:** `createSupervisionSchema` (Zod)

**Ответ:**

```json
{ "success": true, "record": { ... } }
```

**Ошибки:**

- 400 — некорректные данные

---

### GET `/supervision/list`

**Handler:** `listSupervisionHandler.ts`

**Назначение:** Получение всех записей супервизии пользователя вместе с вложенными часами. Поддерживает фильтрацию по `RecordStatus`.

**Ответ:**

```json
{ "records": [ { id, hours: [...] } ] }
```

---

### GET `/supervision/summary`

**Handler:** `supervisionSummaryHandler.ts`

**Назначение:** Подсчёт валидных (CONFIRMED) часов супервизии пользователя по категориям.
Возвращает процент выполнения требований к следующей группе.

**Ответ:**

```json
{
  "required": { instructor, curator, supervisor } | null,
  "percent": { instructor, curator, supervisor } | null,
  "usable": { instructor, curator, supervisor }
}
```

**Логика:**

- Вычисляется активная группа пользователя по `rank`
- Учитываются только подтверждённые часы (`CONFIRMED`)
- Требования по группам заданы в `hourRequirementsByGroup`

**Ошибки:**

- 401 — не авторизован
- 404 — пользователь не найден
