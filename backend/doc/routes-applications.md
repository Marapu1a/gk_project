## 📄 Заявки на супервизию

### 📥 POST `/supervision-requests`

**Назначение:** Отправка новой заявки на супервизию студентом.

**Авторизация:** требуется (JWT)

**Валидация:** `supervisionRequestSchema`

**Тело запроса:**

```json
{
  "supervisorEmail": "supervisor@example.com",
  "hoursInstructor": 8,
  "hoursCurator": 4,
  "hoursSupervisor": 2
}
```

**Ответ:**

```json
{
  "id": "...",
  "status": "PENDING",
  "createdAt": "...",
  "supervisor": {
    "id": "...",
    "email": "supervisor@example.com",
    "fullName": "Имя Фамилия"
  }
}
```

**Ошибки:**

- 400 — неверные данные или не супервизор
- 401 — не авторизован
- 404 — супервизор не найден

---

### 📄 GET `/supervision-requests`

**Назначение:** Получение всех заявок, отправленных текущим студентом.

**Авторизация:** требуется (JWT)

**Ответ:** массив заявок:

```json
[
  {
    "id": "...",
    "status": "APPROVED",
    "createdAt": "...",
    "hoursInstructor": 8,
    "hoursCurator": 4,
    "hoursSupervisor": 2,
    "supervisor": {
      "email": "supervisor@example.com",
      "fullName": "Имя Фамилия"
    }
  }
]
```

**Ошибки:**

- 401 — не авторизован

---

### 📋 GET `/supervision-requests/assigned`

**Назначение:** Получение всех заявок, назначенных текущему супервизору (или админу).

**Авторизация:** требуется (JWT)

**Ответ:** массив заявок:

```json
[
  {
    "id": "...",
    "status": "PENDING",
    "createdAt": "...",
    "hoursInstructor": 4,
    "hoursCurator": 4,
    "hoursSupervisor": 4,
    "approvedHoursInstructor": null,
    "approvedHoursCurator": null,
    "approvedHoursSupervisor": null,
    "student": {
      "email": "student@example.com",
      "fullName": "Имя Фамилия"
    }
  }
]
```

**Ошибки:**

- 401 — не авторизован
- 403 — нет доступа (не супервизор и не админ)

---

### ✅ POST `/supervision-requests/:id/status`

**Назначение:** Обновление статуса заявки и количества подтверждённых часов.

**Авторизация:** требуется (JWT; только супервизор заявки или админ)

**Валидация:** `updateSupervisionStatusSchema`

**Тело запроса:**

```json
{
  "status": "APPROVED",
  "approvedHoursInstructor": 4,
  "approvedHoursCurator": 2,
  "approvedHoursSupervisor": 0
}
```

**Ответ:**

```json
{
  "updated": true,
  "status": "APPROVED"
}
```

**Ошибки:**

- 400 — не указан ID или неверные данные
- 401 — не авторизован
- 403 — нет прав на изменение чужой заявки
- 404 — заявка не найдена

---

## 🔧 Определение роутов

```ts
// routes/supervision-requests.ts
app.post('/supervision-requests', { preHandler: verifyToken }, createApplicationHandler);
app.get('/supervision-requests', { preHandler: verifyToken }, listApplicationsHandler);
app.get('/supervision-requests/assigned', { preHandler: verifyToken }, listAssignedRequestsHandler);
app.post(
  '/supervision-requests/:id/status',
  { preHandler: verifyToken },
  updateRequestStatusHandler,
);
```
