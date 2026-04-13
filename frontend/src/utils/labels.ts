// src/features/utils/labels.ts

// CEU категории
export const ceuCategoryLabels: Record<string, string> = {
  GENERAL: 'Общие',
  ETHICS: 'Этика',
  CULTURAL_DIVERSITY: 'Культурное разнообразие',
  SUPERVISION: 'Супервизия',
};

// Типы практики (супервизия)
export const practiceLevelLabels: Record<string, string> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
  PRACTICE: 'Практика',
  SUPERVISION: 'Менторство',
  IMPLEMENTING: 'Имплементинг',
  PROGRAMMING: 'Программинг',
};

// Уровни для выбора
export const targetLevelLabels: Record<string, string> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
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
  DOCUMENT_REVIEW: 'Экспертиза документов',
  EXAM_ACCESS: 'Экзамен',
  FULL_PACKAGE: 'Сертификация - пакет со скидкой 10%',
  REGISTRATION: 'Подача заявки на сертификацию и учет часов практики',
  RENEWAL: 'Ресертификация',
};

// Если нужен красивый вывод с уровнем
export function getPaymentTypeLabel(type: string, targetLevel?: string | null): string {
  if (type === 'RENEWAL') {
    return 'Ресертификация';
  }

  return paymentTypeLabels[type] || type;
}

// Статусы платежей
export const paymentStatusLabels: Record<string, string> = {
  PAID: 'Оплачен',
  UNPAID: 'Не оплачен',
  PENDING: 'Ожидает подтверждения',
};

// Статусы заявок на экзамен
export const examStatusLabels: Record<string, string> = {
  NOT_SUBMITTED: 'Не подана',
  PENDING: 'На рассмотрении',
  APPROVED: 'Одобрена',
  REJECTED: 'Отклонена',
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

// Статусы заявок на проверку документов
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

// Категории файлов
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
