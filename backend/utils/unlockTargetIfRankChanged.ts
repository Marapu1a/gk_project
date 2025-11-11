// src/utils/unlockTargetIfRankChanged.ts
import { PrismaClient, Prisma } from '@prisma/client';

type Tx = PrismaClient | Prisma.TransactionClient;

/**
 * Если активный ранг пользователя изменился относительно targetLockRank —
 * снимаем замок И сбрасываем выбранную цель (возврат на «лесенку»).
 * Возвращает true, если был произведён сброс.
 */
export async function unlockTargetIfRankChanged(userId: string, prismaOrTx: Tx): Promise<boolean> {
  const user = await prismaOrTx.user.findUnique({
    where: { id: userId },
    select: {
      targetLevel: true,
      targetLockRank: true,
      groups: { select: { group: { select: { rank: true } } } },
    },
  });
  if (!user) return false;

  const activeRank =
    user.groups.map((g) => g.group.rank).sort((a, b) => b - a)[0] ?? null;

  // если нет фиксированного ранга и цель не выбрана — нечего делать
  if (user.targetLockRank == null && user.targetLevel == null) return false;

  // если ранг изменился — снимаем lock и сбрасываем цель
  if (activeRank !== user.targetLockRank) {
    await prismaOrTx.user.update({
      where: { id: userId },
      data: {
        targetLockRank: null,
        targetLevel: null, // ключевая правка: обнуляем цель при смене ранга
      },
    });
    return true;
  }

  return false;
}
