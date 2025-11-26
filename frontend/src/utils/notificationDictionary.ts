// src/utils/notificationDictionary.ts

export type NotificationType =
  | 'CEU'
  | 'SUPERVISION'
  | 'MENTORSHIP'
  | 'DOCUMENT'
  | 'EXAM'
  | 'PAYMENT'
  | 'NEW_USER';

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  CEU: 'CEU',
  EXAM: 'Экзамен',
  PAYMENT: 'Оплата',
  DOCUMENT: 'Документы',
  SUPERVISION: 'Супервизия',
  MENTORSHIP: 'Менторство',
  NEW_USER: 'Новый пользователь',
};

export const NOTIFICATION_TYPE_COLORS: Record<NotificationType, string> = {
  CEU: 'bg-green-600',
  EXAM: 'bg-blue-600',
  PAYMENT: 'bg-gray-700',
  DOCUMENT: 'bg-orange-600',
  SUPERVISION: 'bg-purple-600',
  MENTORSHIP: 'bg-indigo-600',
  NEW_USER: 'bg-emerald-600',
};
