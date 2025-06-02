## 👤 Пользователь

### 🔎 GET `/users/me`

**Назначение:** Получение данных текущего пользователя по JWT-токену.

**Авторизация:** требуется (JWT в заголовке)

**Ответ:**

```json
{
  "id": "user_id",
  "email": "user@example.com",
  "role": "STUDENT",
  "fullName": "Иван Иванов"
}
```

**Ошибки:**

- 401 — не авторизован (нет `userId` в токене)
- 404 — пользователь не найден в БД

---

### 🧮 GET `/users/supervision-hours/summary`

**Назначение:** Получение суммарных подтверждённых часов супервизии по всем типам (по текущему пользователю).

**Авторизация:** требуется (JWT в заголовке)

**Ответ:**

```json
{
  "hoursInstructor": 24,
  "hoursCurator": 16,
  "hoursSupervisor": 12
}
```

**Примечание:** суммируются только записи со статусом `APPROVED` и не `null` значения в `approvedHours*`

**Ошибки:**

- 401 — не авторизован

---

🔧 Определение роутов

```ts
// routes/user.ts
app.get('/users/me', { preHandler: verifyToken }, meHandler);
app.get('/supervision-hours/summary', { preHandler: verifyToken }, getSupervisionHoursHandler);
```
