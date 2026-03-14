// src/utils/unlockTargetIfRankChanged.ts
import { PrismaClient, Prisma } from '@prisma/client';

type Tx = PrismaClient | Prisma.TransactionClient;

/**
 * Если активный ранг пользователя изменился относительно targetLockRank —
 * снимаем замок (targetLockRank = null).
 *
 * В эпоху циклов НЕ сбрасываем targetLevel здесь:
 * сброс/смена цели делает setTargetLevelHandler (там же управляется cycle).
 *
 * Возвращает true, если lock был снят.
 */
export async function unlockTargetIfRankChanged(userId: string, prismaOrTx: Tx): Promise<boolean> {
  const user = await prismaOrTx.user.findUnique({
    where: { id: userId },
    select: {
      targetLockRank: true,
      groups: { select: { group: { select: { rank: true } } } },
    },
  });
  if (!user) return false;

  // если lock не установлен — нечего делать
  if (user.targetLockRank == null) return false;

  const activeRank =
    user.groups.map((g) => g.group.rank).sort((a, b) => b - a)[0] ?? null;

  // если ранг изменился — снимаем lock
  if (activeRank !== user.targetLockRank) {
    await prismaOrTx.user.update({
      where: { id: userId },
      data: { targetLockRank: null },
    });
    return true;
  }

  return false;
}
