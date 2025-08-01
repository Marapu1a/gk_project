# Описание платформы ЦС ПАП

Платформа ЦС ПАП (Центр Сертификации по Прикладному Анализу Поведения) — автономная система, реализующая весь процесс сертификации (получения, продления и отслеживания) в одной единой системе.

---

## Этапы разработки

### Этап 1

- JWT-авторизация через email, роли: `STUDENT`, `ADMIN`
- Личный кабинет: часы, баллы, группы
- Заявки на подтверждение часов супервизии
- Супервизор: подтверждение/отклонение часов
- Админ: подтверждение CEU, выдача сертификата
- Публичный реестр сертифицированных

### Этап 2

- Загрузка CEU-файлов, инвалидация, сводка баллов
- Две шкалы CEU-баллов: **накопительная** (все валидные) и **процентная** (только актуальные непотраченные)
- Выпуск сертификата с обнулением процентной шкалы
- Заявки на менторство

---

## CEU-записи

- Статус: `is_valid: boolean`, `spentOnCertificate: boolean`
- 4 типа баллов:

  - Этика
  - Культурное разнообразие
  - Супервизия
  - Общие баллы

- Инвалидные или потраченные CEU не учитываются в процентной шкале
- Сброс `spentOnCertificate = true` происходит при выпуске сертификата

---

## Логика сертификации

1. Пользователь регистрируется. По умолчанию роль STUDENT, группа "Студент".
2. Присоединение к группам = прогресс. Если есть несколько групп, основная = с минимальным `rank`
3. Часы супервизии подтверждаются супервизором
4. CEU-записи оценивает админ
5. При достижении нормы админ вручную выдаёт сертификат:

   - Указывает email, ФИО, уровень, даты, загружает файл
   - Все CEU с `is_valid=true && spentOnCertificate=false` отмечаются как `spent`
   - Обновляется группа
   - Старый сертификат деактивируется

6. Сертификат отображается в личном кабинете
7. Если его срок истёк — он отображается, но квалификация недействительна
8. Старые сертификаты хранятся в истории

---

## Роли и группы

- Роль определяет технические права (`STUDENT`, `ADMIN`)
- Группы отражают квалификационный уровень:

  - Студент
  - Инструктор
  - Куратор
  - Супервизор
  - Опытный супервизор

- Группа влияет на CEU-нормативы и квалификацию
- Пользователь может быть в нескольких группах, активной считается та, у которой `rank` наименьший

---

## Шкалы CEU

### Процентная шкала:

- Учитывает только валидные и не потраченные записи
- Максимум = 100%
- Используется для определения готовности к сертификации
- Нормативы по группам:

  - Инструктор: этика 1, культура 1, общее 2
  - Куратор: этика 2, культура 2, общее 4
  - Супервизор: этика 2, культура 2, общее 6, супервизия 2

### Накопительная шкала:

- Суммирует все валидные записи, включая потраченные
- Используется для отображения общего опыта

---

## Публичный реестр

- Доступен без авторизации
- Фильтрация по имени, квалификации
- Видны только активные сертификаты

---

## API (планируется на этап 2)

- Получение данных о часах супервизии
- Получение CEU-баллов
- Проверка сертификатов

---

## Общее

- Вся логика расчётов и проверок — на бэкенде
- Фронтенд: максимально лёгкий, получает агрегированные данные
- Любые действия проходят проверку авторизации через JWT

## Заголовки ТЗ (чеклист функциональности, бэкенд)

1. ✅Создание заявок на подтверждение часов супервизии
2. ✅Рассмотрение заявок на подтверждение часов супервизии
3. ✅Просмотр числа подтвержденных часов супервизии
4. ✅Создание CEU-записей
5. ✅Рассмотрение созданных CEU-записей
6. ✅Просмотр своих CEU-баллов
7. ✅Выпуск сертификата
8. ✅Создание заявок на подтверждение часов менторства
9. ✅Рассмотрение заявок на подтверждение часов менторства

---

## Чеклист фронтенда ЦС ПАП

**🔐 Авторизация и регистрация**

- ✅Регистрация STUDENT (валидация, двойной пароль)
- ✅Авторизация (редирект по роли)
- ✅Защита маршрутов (ProtectedRoute, AdminRoute)
- ✅Logout
- ✅useCurrentUser, useAuth

**📝 Создание заявок на подтверждение часов супервизии**

- Форма создания заявки
- Валидация (дата, тип супервизии, часы)
- Отправка запроса
- Список своих заявок (draft/sent)

**👀 Рассмотрение заявок на супервизию (только ADMIN)**

- Таблица заявок со статусами
- Подтверждение/отклонение
- Редактирование часов, если нужно

**📊 Просмотр подтвержденных часов супервизии (для STUDENT)**

- Отображение суммарных часов (/users/supervision-hours/summary)
- Группировка по ролям (инструктор, куратор, супервизор)

**📥 Создание CEU-записей**

- Форма загрузки файла
- Название/тип активности
- Валидация формата
- Отправка и отображение статуса (PENDING)

**🔎 Рассмотрение CEU-записей (только ADMIN)**

- Таблица записей
- Просмотр файла
- Подтверждение / отклонение
- Комментарий/причина отказа

**🎯 Просмотр своих CEU-баллов (STUDENT)**

- Общий счётчик баллов
- Список всех записей со статусами
- Фильтрация по типу / статусу

**🎓 Выпуск сертификата**

- Кнопка запроса сертификата (если выполнены условия)
- Генерация PDF / ID сертификата
- Отображение сертификата + публичная ссылка

**🙋‍♂️ Заявки на подтверждение часов менторства**

- Форма аналогична супервизии
- Своя вкладка/раздел
- Индикация типа

**👀 Рассмотрение заявок на менторство (ADMIN)**

- Аналогично супервизии
- Возможность подтвердить / отклонить / скорректировать

**📌 Дополнительно**

- Универсальный layout с хедером
- Навигация по ролям
- Роутинг по разделам
- Loader-состояния, skeletons
