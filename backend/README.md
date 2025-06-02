# 📘 ЦС ПАП — Документация backend API

## 🔗 Оглавление

1. [Общее описание и Prisma schema](./doc/backend-schema-doc.md)
2. [Авторизация (`/auth`)](./doc/routes-auth.md)
3. [Пользовательские данные (`/users`)](./doc/routes-users.md)
4. [Заявки на супервизию (`/supervision-requests`)](./doc/routes-applications.md)
5. [CEU-файлы (`/ceu-records`, `/ceu/my`)](./doc/routes-ceu.md)
6. [Сертификаты (`/certificates`)](./doc/routes-certificates.md)
7. [Группы (`/groups`)](./doc/routes-groups.md)
8. [Менторские часы (`/mentorship-requests`)](./doc/routes-mentorship.md)

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
