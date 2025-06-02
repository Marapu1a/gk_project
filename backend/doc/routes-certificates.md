## 🪪 Сертификаты

### 🆕 POST `/certificates`

**Назначение:** Выдача нового сертификата пользователю администратором.

**Авторизация:** требуется (JWT, только ADMIN)

**Тело запроса:**

```json
{
  "email": "user@example.com",
  "level": "Куратор",
  "issuedAt": "2025-06-01",
  "expiresAt": "2026-06-01",
  "fileUrl": "https://example.com/cert.pdf"
}
```

**Внутренняя логика:**

1. Деактивация предыдущих сертификатов
2. Очистка `activeForUserId`
3. Проверка: продление или нет (тот же уровень)
4. CEU помечаются как использованные
5. Создание нового сертификата с `isActive: true`
6. Добавление пользователя в группу (`level`) и в `Опытный level`, если это продление

**Ответ:**

```json
{
  "success": true,
  "certificate": { ... },
  "extended": true
}
```

**Ошибки:**

- 403 — нет прав
- 404 — пользователь не найден

---

## 🔧 Определение роутов

```ts
// routes/certificates.ts
app.post('/certificates', { preHandler: verifyToken }, createCertificate);
```

---

## 🏷️ Группы

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
