## Авторизация

### 🔐 POST `/auth/register`

**Назначение:** Регистрация нового пользователя с ролью STUDENT по умолчанию.

**Валидация:** `registerSchema` (Zod)

**Тело запроса:**

```json
{
  "email": "user@example.com",
  "firstName": "Иван",
  "lastName": "Иванов",
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

---

### 🔐 POST `/auth/login`

**Назначение:** Авторизация пользователя и получение JWT + редирект по роли.

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
    "role": "STUDENT"
  },
  "redirectTo": "/dashboard" // или "/admin" для ADMIN
}
```

**Ошибки:**

- 400 — неверный формат тела
- 401 — неправильный email или пароль

🔧 Определение роутов

```ts
// routes/auth.ts
app.post('/auth/register', registerHandler);
app.post('/auth/login', loginHandler);
```
