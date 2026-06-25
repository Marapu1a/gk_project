import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { logAdminUserAction } from '../../utils/adminUserActionLog';

const bodySchema = z.object({
  text: z.string().trim().min(1).max(1000),
});

export async function createUserNoteHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };
  const parsed = bodySchema.safeParse(req.body);

  if (!parsed.success) {
    return reply.code(400).send({
      error: 'Некорректная заметка',
      details: parsed.error.flatten(),
    });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!user) {
    return reply.code(404).send({ error: 'Пользователь не найден' });
  }

  const note = await logAdminUserAction({
    userId: id,
    adminId: req.user.userId,
    action: 'Заметка администратора',
    details: parsed.data.text,
  });

  return reply.code(201).send({ ok: true, note });
}
