// src/handlers/user/updateTargetLevel.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function updateTargetLevelHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };
  const { targetLevel } = req.body as {
    targetLevel: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null;
  };

  if (req.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Недостаточно прав' });
  }

  // Запрос должен явно уметь сбрасывать уровень (null)
  try {
    await prisma.user.update({
      where: { id },
      data: {
        targetLevel: targetLevel ?? null,
        // targetLockRank можно не трогать или обнулять — делаю **минимально**
        // targetLockRank: null
      },
    });

    return reply.send({ ok: true, targetLevel });
  } catch (err) {
    return reply.code(500).send({ error: 'Не удалось обновить targetLevel' });
  }
}
