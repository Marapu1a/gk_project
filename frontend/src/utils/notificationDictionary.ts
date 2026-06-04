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

export function normalizeNotificationLink(
  link: string | null,
  type: NotificationType,
  message = '',
) {
  if (!link) return null;

  if (link === '/dashboard') return '/dashboard-v2';
  if (link === '/supervision-hours') return '/supervision/hours?panel=history';
  if (link === '/history') {
    return type === 'CEU' ? '/ceu/points?panel=history' : '/supervision/hours?panel=history';
  }
  if (link === '/review/supervision') {
    return message.toLowerCase().includes('ментор')
      ? '/reviewer/candidates/mentorship'
      : '/reviewer/candidates/supervision';
  }

  return link;
}
