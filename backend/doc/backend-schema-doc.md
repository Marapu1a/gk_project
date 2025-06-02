## 1. Общее описание

Платформа ЦС ПАП предназначена для учёта квалификаций специалистов, прохождения супервизии, загрузки CEU-файлов и автоматического расчёта допуска к следующему уровню сертификации.

**Основные сущности:**

- Пользователь (роль STUDENT или ADMIN)
- Супервизия (заявки, подтверждение часов)
- CEU-файлы (этические, культурные, супервизорские, общие)
- Сертификаты (уровни, статусы, выдача, отзыв)
- Группы (распределение прав и логики по квалификациям)

**Основной стек:**

- Fastify + TypeScript
- Prisma + PostgreSQL
- JWT-аутентификация
- Валидация через Zod
- Модульная архитектура, test-first

---

## 2. Prisma schema — модели базы данных

### 🧍 User

```ts
id: String @id @default(cuid())
email: String @unique
firstName, lastName: String
password: String
phone: String? (необязательный)
role: STUDENT | ADMIN (по умолчанию STUDENT)
createdAt: DateTime @default(now())
```

**Связи:**

- supervisionRequests — заявки на супервизию как студент
- supervisedRequests — заявки как супервизор
- mentorshipRequestsSent / mentorshipRequestsReceived — заявки на менторство
- ceuRecords — CEU-файлы пользователя
- certificates — все сертификаты
- activeCertificate — активный сертификат
- groups — связи с группами (роль в контексте сертификации)

---

### 📌 SupervisionRequest

```ts
id: String @id @default(cuid())
status: PENDING | APPROVED | REJECTED (по умолчанию PENDING)
hoursInstructor, hoursCurator, hoursSupervisor: Float
approvedHoursInstructor, approvedHoursCurator, approvedHoursSupervisor: Float?
createdAt: DateTime @default(now())
```

**Связи:**

- student: User (студент, кто подал заявку)
- supervisor: User (супервизор, кто её одобряет)

---

### 🧠 MentorshipRequest

```ts
id: String @id @default(cuid())
hours: Float
status: PENDING | APPROVED | REJECTED
createdAt: DateTime @default(now())
```

**Связи:**

- mentor: User — кто подаёт как ментор
- approver: User — кто подтверждает

---

### 🪪 Certificate

```ts
id: String @id @default(cuid())
level: String
issuedAt, expiresAt: DateTime
status: ACTIVE | REVOKED | EXPIRED
fileUrl: String?
isActive: Boolean (по умолчанию false)
```

**Связи:**

- user: User — владелец
- activeForUser — если это текущий активный сертификат

---

### 🗂️ CEURecord

```ts
id: String @id @default(cuid())
file_id: String? — ID файла (внешнее хранилище)
spentOnCertificate: Boolean — учтён ли файл в сертификате
ceu_ethics, ceu_cult_diver, ceu_superv, ceu_general: Float
is_valid: Boolean — не инвалидирован ли вручную
createdAt: DateTime @default(now())
```

**Связи:**

- user: User — кому принадлежит файл

---

### 🏷️ Group & UserGroup

```ts
Group: id, name (уникальное имя группы)
UserGroup: userId, groupId (многие ко многим)
```

**Примеры групп:**

- Инструктор
- Куратор
- Супервизор
- Опытный супервизор

Используется для бизнес-логики допуска и фильтрации прав доступа.
