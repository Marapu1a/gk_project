## 📚 CEU-файлы

### ➕ POST `/ceu-records`

**Назначение:** Добавление новой CEU-записи пользователем.

**Авторизация:** требуется (JWT)

**Валидация:** `createCEUSchema`

**Тело запроса:**

```json
{
  "event_name": "Семинар по этике",
  "event_date": "2024-12-01",
  "file_id": "file_xyz",
  "ceu_ethics": 2,
  "ceu_cult_diver": 1,
  "ceu_superv": 0,
  "ceu_general": 1
}
```

**Ответ:**

```json
{
  "id": "...",
  "createdAt": "..."
}
```

**Ошибки:**

- 400 — неверные данные
- 401 — не авторизован

---

### 📂 GET `/ceu/my`

**Назначение:** Получение списка и суммарных CEU текущего пользователя.

**Авторизация:** требуется (JWT)

**Ответ:**

```json
{
  "total": {
    "ethics": 5,
    "cultDiver": 3,
    "supervision": 2,
    "general": 4
  },
  "records": [
    {
      "id": "...",
      "eventName": "Семинар по культуре",
      "eventDate": "2024-11-01",
      ...
    }
  ]
}
```

**Ошибки:**

- 401 — не авторизован

---

### 🗃 GET `/ceu-records`

**Назначение:** Получение всех CEU-записей в системе (только для администратора).

**Авторизация:** требуется (JWT, ADMIN)

**Ответ:** массив записей со связью на пользователя

**Ошибки:**

- 403 — доступ запрещён

---

### 🚫 POST `/ceu-records/:id/invalidate`

**Назначение:** Инвалидация или повторная активация CEU-записи (только для администратора).

**Авторизация:** требуется (JWT, ADMIN)

**Тело запроса:**

```json
{
  "makeValid": false
}
```

**Ответ:**

```json
{
  "updated": true,
  "is_valid": false
}
```

**Ошибки:**

- 400 — неверные данные или запись уже потрачена
- 403 — доступ запрещён
- 404 — запись не найдена

---

## 🔧 Определение роутов

```ts
// routes/ceu.ts
app.post('/ceu-records', { preHandler: verifyToken }, createCEUHandler);
app.get('/ceu-records', { preHandler: verifyToken }, listAllCEUHandler);
app.post('/ceu-records/:id/invalidate', { preHandler: verifyToken }, invalidateCEUHandler);
app.get('/ceu/my', { preHandler: verifyToken }, getMyCEU);
```
