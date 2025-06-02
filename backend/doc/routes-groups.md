## 🏷️ Роуты: Группы

### ➕ POST `/groups/:groupId/add-user`

**Назначение:** Добавление пользователя в группу по ID группы (только для администратора).

**Авторизация:** требуется (JWT, ADMIN)

**Тело запроса:**

```json
{
  "userId": "..."
}
```

**Ответ:**

```json
{
  "success": true
}
```

**Ошибки:**

- 400 — отсутствует userId или groupId
- 403 — нет доступа
- 404 — группа не найдена
- 500 — ошибка сервера

---

### ➖ POST `/groups/:groupId/remove-user`

**Назначение:** Удаление пользователя из группы по ID (только для администратора).

**Авторизация:** требуется (JWT, ADMIN)

**Тело запроса:**

```json
{
  "userId": "..."
}
```

**Ответ:**

```json
{
  "success": true
}
```

**Ошибки:**

- 400 — отсутствует userId или groupId
- 403 — нет доступа
- 404 — группа не найдена
- 500 — ошибка сервера

---

### 📋 GET `/groups`

**Назначение:** Получение списка всех групп в системе (только для администратора).

**Авторизация:** требуется (JWT, ADMIN)

**Ответ:**

```json
[
  {
    "id": "...",
    "name": "Супервизоры"
  },
  ...
]
```

**Ошибки:**

- 403 — нет доступа

---

### 👥 GET `/groups/:groupId/users`

**Назначение:** Получение списка пользователей, входящих в указанную группу.

**Авторизация:** требуется (JWT, ADMIN)

**Ответ:**

```json
[
  {
    "id": "...",
    "email": "user@example.com",
    "fullName": "Имя Фамилия"
  },
  ...
]
```

**Ошибки:**

- 403 — нет доступа
- 404 — группа не найдена

---

## 🔧 Определение роутов

```ts
// routes/groups.ts
app.post('/groups/:groupId/add-user', { preHandler: verifyToken }, addUserToGroupHandler);
app.post('/groups/:groupId/remove-user', { preHandler: verifyToken }, removeUserFromGroupHandler);
app.get('/groups', { preHandler: verifyToken }, listGroupsHandler);
app.get('/groups/:groupId/users', { preHandler: verifyToken }, listUsersInGroupHandler);
```
