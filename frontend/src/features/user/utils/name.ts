// src/features/user/utils/name.ts

/**
 * Приводит строку к Title Case
 * - поддерживает пробелы и дефисы
 * - не лезет в локали (поведение как сейчас)
 */
export function titleCaseAny(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((token) =>
      token
        .split('-')
        .map((p) => (p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p))
        .join('-'),
    )
    .join(' ');
}

/**
 * Делит полное ФИО на части
 * "Иванов Иван Иванович" → { lastName, firstName, middleName }
 */
export function splitFullName(fullName?: string | null) {
  const parts = String(fullName || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  const [lastName = '', firstName = '', ...rest] = parts;
  const middleName = rest.length ? rest.join(' ') : '';

  return { lastName, firstName, middleName };
}

/**
 * Собирает ФИО на русском
 */
export function buildFullNameRu(
  lastName: string,
  firstName: string,
  middleName: string,
): string {
  const ln = titleCaseAny(lastName);
  const fn = titleCaseAny(firstName);
  const mn = titleCaseAny(middleName);

  return [ln, fn, mn].filter(Boolean).join(' ');
}

/**
 * Собирает ФИО латиницей
 */
export function buildFullNameLatin(
  lastNameLatin: string,
  firstNameLatin: string,
): string {
  const ln = titleCaseAny(lastNameLatin);
  const fn = titleCaseAny(firstNameLatin);

  return [ln, fn].filter(Boolean).join(' ');
}
