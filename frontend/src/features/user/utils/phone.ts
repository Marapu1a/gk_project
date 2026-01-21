// src/features/user/utils/phone.ts

/**
 * Нормализует телефон к виду +XXXXXXXX
 */
export function normalizePhone(raw: string): string {
  const digits = String(raw).replace(/[^\d+]/g, '');
  if (!digits) return '';
  return digits.startsWith('+') ? digits : `+${digits}`;
}
