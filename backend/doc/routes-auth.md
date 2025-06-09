## 🔐 Auth: Авторизация и восстановление доступа

### POST `/auth/register`

**Назначение:** Регистрация нового пользователя с базовой ролью `STUDENT` и автоматическим добавлением в группу `Студент`.

**Валидация:** `registerSchema` (Zod)

**Тело запроса:**

```json
{
  "email": "user@example.com",
  "fullName": "Иван Иванов",
  "phone": "+79991234567",
  "password": "******"
}
```

**Ответ:**

```json
{
  "token": "JWT_TOKEN",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "role": "STUDENT",
    "fullName": "Иван Иванов"
  }
}
```

**Ошибки:**

- 400 — неверный формат тела
- 409 — email уже используется
- 500 — группа `Студент` не найдена

---

### POST `/auth/login`

**Назначение:** Авторизация пользователя, генерация JWT и редирект по роли.

**Валидация:** `loginSchema` (Zod)

**Тело запроса:**

```json
{
  "email": "user@example.com",
  "password": "******"
}
```

**Ответ:**

```json
{
  "token": "JWT_TOKEN",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "role": "STUDENT",
    "fullName": "Иван Иванов"
  },
  "redirectTo": "/dashboard" // или "/admin" для ADMIN
}
```

**Ошибки:**

- 400 — неверный формат тела
- 401 — неверный email или пароль

---

### GET `/auth/me`

**Назначение:** Получение информации о текущем пользователе по JWT.

**Требуется авторизация:** `verifyToken`

**Ответ:**

```json
{
  "id": "...",
  "email": "user@example.com",
  "role": "STUDENT",
  "fullName": "Иван Иванов",
  "groups": [{ "id": "...", "name": "Студент" }],
  "primaryGroup": {
    "id": "...",
    "name": "Студент"
  }
}
```

**Ошибки:**

- 401 — не авторизован
- 404 — пользователь не найден

---

### POST `/auth/forgot-password`

**Назначение:** Отправка письма со ссылкой на сброс пароля.

**Валидация:**

```json
{
  "email": "user@example.com"
}
```

**Ответ:**

```json
{ "success": true }
```

**Ошибки:**

- 400 — неверный формат тела
- 500 — сбой отправки письма / отсутствует секрет

---

### POST `/auth/reset-password`

**Назначение:** Сброс пароля по токену из email.

**Валидация:**

```json
{
  "token": "TOKEN",
  "password": "новый_пароль"
}
```

**Ответ:**

```json
{ "success": true }
```

**Ошибки:**

- 400 — неверный формат тела
- 401 — недействительный или просроченный токен
- 500 — отсутствует секрет или внутренняя ошибка

---

### 🔧 Определение роутов

```ts
app.post('/auth/register', registerHandler);
app.post('/auth/login', loginHandler);
app.get('/auth/me', { preHandler: verifyToken }, meHandler);
app.post('/auth/forgot-password', forgotPasswordHandler);
app.post('/auth/reset-password', resetPasswordHandler);
```

**Мидлвары:** `verifyToken` — парсит и проверяет JWT, добавляет `user` в `req`.
