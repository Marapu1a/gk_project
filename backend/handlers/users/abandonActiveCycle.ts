import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

type Params = { id: string };
type Body = { reason?: string };

export async function abandonActiveCycleHandler(req: FastifyRequest, reply: FastifyReply) {
  const { user } = req as any;
  const { id } = req.params as Params;
  const { reason } = req.body as Body;

  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  if (user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'FORBIDDEN' });
  }

  const abandonedReason = reason?.trim();
  if (!abandonedReason) {
    return reply.code(400).send({ error: 'ABANDON_REASON_REQUIRED' });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  });

  if (!dbUser) {
    return reply.code(404).send({ error: 'USER_NOT_FOUND' });
  }

  const adminList = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true },
  });
  const adminIds = adminList.map((a) => a.id);

  const result = await prisma.$transaction(async (tx) => {
    const activeCycle = await tx.certificationCycle.findFirst({
      where: { userId: id, status: 'ACTIVE' },
      select: {
        id: true,
        targetLevel: true,
        type: true,
        status: true,
      },
    });

    if (!activeCycle) {
      throw new Error('ACTIVE_CYCLE_NOT_FOUND');
    }

    const updatedCycle = await tx.certificationCycle.update({
      where: { id: activeCycle.id },
      data: {
        status: 'ABANDONED',
        endedAt: new Date(),
        abandonedReason,
      },
      select: {
        id: true,
        targetLevel: true,
        status: true,
        endedAt: true,
        abandonedReason: true,
      },
    });

    const updatedUser = await tx.user.update({
      where: { id },
      data: {
        targetLevel: null,
        targetLockRank: null,
      },
      select: {
        id: true,
        targetLevel: true,
        targetLockRank: true,
      },
    });

    const reset = await tx.payment.updateMany({
      where: {
        userId: id,
        type: { in: ['DOCUMENT_REVIEW', 'EXAM_ACCESS', 'REGISTRATION', 'FULL_PACKAGE'] },
        status: { in: ['PENDING', 'PAID'] },
      },
      data: {
        status: 'UNPAID',
        confirmedAt: null,
        comment: 'Сброшено: цикл отменён администратором',
      },
    });

    if (adminIds.length) {
      const message =
        `Администратор отменил активный цикл пользователя ` +
        `${dbUser.fullName ?? dbUser.email ?? dbUser.id}. ` +
        `Сброшено платежей: ${reset.count}.`;

      await tx.notification.createMany({
        data: adminIds.map((adminId) => ({
          userId: adminId,
          type: 'PAYMENT' as any,
          message,
          link: `/admin/users/${id}`,
        })),
      });
    }

    return {
      cycle: updatedCycle,
      user: updatedUser,
      resetCount: reset.count,
    };
  }).catch((err) => {
    if (err instanceof Error && err.message === 'ACTIVE_CYCLE_NOT_FOUND') {
      return null;
    }
    throw err;
  });

  if (!result) {
    return reply.code(404).send({ error: 'ACTIVE_CYCLE_NOT_FOUND' });
  }

  return reply.send(result);
}
