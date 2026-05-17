import { PrismaClient } from '@prisma/client';

type PrismaLike = Pick<PrismaClient, '$queryRaw'>;

export async function getNextRegistrationNumber(prisma: PrismaLike): Promise<string> {
  const rows = await prisma.$queryRaw<{ max: string | null }[]>`
    SELECT MAX("registrationNumber") AS max
    FROM "User"
    WHERE "registrationNumber" IS NOT NULL
  `;

  const current = Number.parseInt(rows[0]?.max ?? '0', 10);
  return String(current + 1).padStart(6, '0');
}
