## 🤝 Подтверждение часов менторства

### 🆕 POST `/mentorship-requests`

**Назначение:** Отправка запроса на подтверждение менторских часов (только для Супервизоров).

**Авторизация:** требуется (JWT)

**Тело запроса:**

```json
{
  "approverEmail": "approver@example.com",
  "hours": 5
}
```

**Ответ:**

```json
{
  "success": true,
  "id": "..."
}
```

**Ошибки:**

- 400 — невалидные данные
- 401 — не авторизован
- 403 — только Супервизоры могут отправлять запросы
- 404 — подтверждающий не найден или не Опытный Супервизор

---

### 📋 GET `/mentorship-requests/assigned`

**Назначение:** Получение списка назначенных запросов на подтверждение (только для Опытных Супервизоров).

**Авторизация:** требуется (JWT)

**Ответ:**

```json
[
  {
    "id": "...",
    "hours": 5,
    "status": "PENDING",
    "createdAt": "...",
    "mentor": {
      "id": "...",
      "email": "mentor@example.com",
      "fullName": "Имя Фамилия"
    }
  }
]
```

**Ошибки:**

- 401 — не авторизован
- 403 — нет доступа (не Опытный Супервизор)

---

### ✅ POST `/mentorship-requests/:id/status`

**Назначение:** Обновление статуса заявки на менторство (`APPROVED` или `REJECTED`).

**Авторизация:** требуется (JWT; только если заявка назначена текущему пользователю)

**Тело запроса:**

```json
{
  "status": "APPROVED"
}
```

**Ответ:**

```json
{
  "success": true
}
```

**Ошибки:**

- 400 — невалидный статус
- 401 — не авторизован
- 403 — заявка не назначена вам
- 404 — заявка не найдена

---

## 🔧 Определение роутов

```ts
// routes/mentorship.ts
app.post('/mentorship-requests', { preHandler: verifyToken }, createMentorshipRequestHandler);
app.get(
  '/mentorship-requests/assigned',
  { preHandler: verifyToken },
  listAssignedMentorshipsHandler,
);
app.post(
  '/mentorship-requests/:id/status',
  { preHandler: verifyToken },
  updateMentorshipStatusHandler,
);
```
