// CEU категории
export const ceuCategoryLabels: Record<string, string> = {
  GENERAL: 'Общие',
  ETHICS: 'Этика',
  CULTURAL_DIVERSITY: 'Культурное разнообразие',
};

// Типы практики (супервизия)
export const practiceLevelLabels: Record<string, string> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
  EXPERIENCED_SUPERVISOR: 'Опытный супервизор',
};

// Статусы записей
export const recordStatusLabels: Record<string, string> = {
  CONFIRMED: 'Подтверждено',
  REJECTED: 'Отклонено',
  UNCONFIRMED: 'Не подтверждено',
  SPENT: 'Использовано',
};

// Типы платежей
export const paymentTypeLabels: Record<string, string> = {
  DOCUMENT_REVIEW: 'Проверка документов',
  EXAM_ACCESS: 'Доступ к экзамену',
  FULL_PACKAGE: 'Полный пакет',
  REGISTRATION: 'Регистрация',
};

// Статусы платежей
export const paymentStatusLabels: Record<string, string> = {
  PAID: 'Оплачен',
  UNPAID: 'Не оплачен',
  PENDING: 'Ожидает подтверждения',
};

// Документы (типы)
export const documentTypeLabels: Record<string, string> = {
  HIGHER_EDUCATION: 'Высшее образование',
  ADDITIONAL_EDUCATION: 'Доп. образование',
  COURSE_CERTIFICATE: 'Сертификат курса',
  WORKSHOP: 'Воркшоп/семинар',
  DIPLOMA: 'Диплом',
  LICENSE: 'Лицензия',
  OTHER: 'Другое',
};

// Статусы заявок на проверку документов (широкое покрытие ключей)
export const docReviewStatusLabels: Record<string, string> = {
  SUBMITTED: 'Отправлена',
  PENDING: 'В очереди',
  IN_REVIEW: 'На проверке',
  UNDER_REVIEW: 'На проверке',
  CONFIRMED: 'Одобрена',
  APPROVED: 'Одобрена',
  REJECTED: 'Отклонена',
  UNCONFIRMED: 'Не подтверждена',
};

// Категории файлов (по сегменту в fileId — опционально для отображения)
export const fileCategoryLabels: Record<string, string> = {
  ceu: 'CEU',
  supervision: 'Супервизия',
  certificates: 'Сертификаты',
  profile: 'Профиль',
  docs: 'Документы',
  misc: 'Разное',
};

// Булевы метки
export const yesNoLabels: Record<'true' | 'false', string> = {
  true: 'Да',
  false: 'Нет',
};

