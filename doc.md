# 📘 GetCourse API — Шпаргалка

## 🔐 Авторизация

- Протокол: **HTTPS**
- Авторизация: **`key={API_KEY}`** в теле POST-запроса
- Действие указывается как: **`action={название}`**
- Параметры — **`params={base64(JSON)}`**

---

## 📤 Импорт пользователей

**URL:** `https://{account}.getcourse.ru/pl/api/users`

### ➕ Добавление / обновление

- `action=add`
- Обязательный параметр: `email`
- Опционально:

  - `first_name`, `last_name`, `phone`, `city`, `country`
  - `group_name`: `['Группа1']` или `[['Группа2', '2024-01-01']]`
  - `addfields`: `{ 'Поле1': 'Значение' }`
  - `system.refresh_if_exists`: `1 | 0`
  - `system.partner_email`: email партнёра

```json
{
  "user": {
    "email": "test@example.com",
    "first_name": "Имя",
    "group_name": ["Группа1"]
  },
  "system": {
    "refresh_if_exists": 1
  }
}
```

---

## 📦 Импорт заказов

**URL:** `https://{account}.getcourse.ru/pl/api/deals`

### ➕ Добавление

- `action=add`
- Обязательные поля:

  - `deal.offer_code` **или** `deal.product_title`
  - `deal.deal_cost`
  - `user.email`

```json
{
  "user": { "email": "test@example.com" },
  "deal": {
    "product_title": "Курс",
    "deal_cost": 5000,
    "deal_status": "new"
  },
  "system": { "refresh_if_exists": 1 }
}
```

---

## 📤 Export API

**URL:** `https://{account}.getcourse.ru/pl/api/account/...`

### Примеры:

- Экспорт пользователей: `/account/users?key=...&email=...`
- Проверка статуса: `/account/exports/{export_id}?key=...`

Лимит: **100 запросов на 2 часа**

---

## ⚠️ Ошибки

- **"Пустой параметр action"** — нет `action` или GET-запрос
- **"Параметры не указаны"** — ошибка в `params`, нет `email`
- **"Не авторизовано"** — неверный ключ или аккаунт
- **"Лимит превышен"** — см. статистику в `.../saas/account/api`

---

## 📎 Прочее

- Формат `params` всегда: **JSON → base64**
- Ответ API:

```json
{
  "success": true,
  "action": "add",
  "result": {
    "success": true,
    "user_id": "123",
    "error": false
  }
}
```

- Для работы с группами и заказами используйте `group_name`, `deal_number`, `deal_status` и `deal_is_paid`

---

Полная дока: [https://getcourse.ru/help/api#users](https://getcourse.ru/help/api#users)
