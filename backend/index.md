# 📘 ЦС ПАП — Документация backend API

## 🔗 Оглавление

1. [Общее описание и Prisma schema](./doc/backend-schema-doc)
2. [Авторизация (`/auth`)](./doc/routes-auth)
3. [Пользовательские данные (`/users`)](./doc/routes-users)
4. [Заявки на супервизию (`/supervision-requests`)](./doc/routes-applications)
5. [CEU-файлы (`/ceu-records`, `/ceu/my`)](./doc/routes-ceu)
6. [Сертификаты (`/certificates`)](./doc/routes-certificates)
7. [Группы (`/groups`)](./doc/routes-groups)
8. [Менторские часы (`/mentorship-requests`)](./doc/routes-mentorship)

## 🧭 Навигация

Каждый раздел содержит:

- Назначение эндпоинтов
- Формат запроса/ответа
- Валидацию и ошибки
- Примеры JSON
- Привязку к ролям
- Определения маршрутов

Документация построена по REST-принципам, JWT применяется в качестве схемы авторизации.

Для тестирования удобно использовать Postman с сохранённым токеном JWT в `Authorization: Bearer <token>`.

---
