// src/utils/notificationDictionary.ts

export type NotificationType =
  | 'CEU'
  | 'SUPERVISION'
  | 'MENTORSHIP'
  | 'DOCUMENT'
  | 'EXAM'
  | 'PAYMENT'
  | 'NEW_USER'
  | 'USER';

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  CEU: 'CEU',
  EXAM: 'Экзамен',
  PAYMENT: 'Оплата',
  DOCUMENT: 'Документы',
  SUPERVISION: 'Супервизия',
  MENTORSHIP: 'Менторство',
  NEW_USER: 'Новый пользователь',
  USER: 'Пользователь',
};

export type NotificationTone = 'dark' | 'soft' | 'danger';

export const NOTIFICATION_TYPE_TONES: Record<NotificationType, NotificationTone> = {
  PAYMENT: 'dark',
  CEU: 'soft',
  DOCUMENT: 'soft',
  SUPERVISION: 'soft',
  MENTORSHIP: 'soft',
  NEW_USER: 'soft',
  USER: 'danger',
  EXAM: 'soft',
};
