import { Prisma } from '@prisma/client';

const SPLIT_RE = /[\s,.;:()"'`/\\|+\-_*[\]{}!?]+/g;

export type UserIdentitySearchOptions = {
  extraTokenConditions?: (token: string, digits: string) => Prisma.UserWhereInput[];
};

export function tokenizeIdentitySearch(query: string): string[] {
  return query
    .toLowerCase()
    .normalize('NFKC')
    .split(SPLIT_RE)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function buildUserIdentitySearchWhere(
  query: string | null | undefined,
  options: UserIdentitySearchOptions = {},
): Prisma.UserWhereInput | null {
  const q = (query ?? '').trim();
  if (!q) return null;

  if (q.includes('@')) {
    return {
      email: { contains: q, mode: 'insensitive' },
    };
  }

  const tokens = tokenizeIdentitySearch(q);
  if (!tokens.length) return null;

  return {
    AND: tokens.map((token) => {
      const tokenDigits = onlyDigits(token);
      const OR: Prisma.UserWhereInput[] = [
        { fullName: { contains: token, mode: 'insensitive' } },
        { fullNameLatin: { contains: token, mode: 'insensitive' } },
        { email: { contains: token, mode: 'insensitive' } },
        ...(options.extraTokenConditions?.(token, tokenDigits) ?? []),
      ];

      if (tokenDigits) {
        OR.push(
          { phone: { contains: tokenDigits, mode: 'insensitive' } },
          { registrationNumber: { contains: tokenDigits, mode: 'insensitive' } },
        );
      }

      return { OR };
    }),
  };
}
