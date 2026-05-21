import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';

const NOTE_ACTION = 'Заметка администратора';

export async function deleteUserNoteHandler(req: FastifyRequest, reply: FastifyReply) {
  if (req.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  const { id, noteId } = req.params as { id: string; noteId: string };

  const note = await prisma.adminUserActionLog.findFirst({
    where: {
      id: noteId,
      userId: id,
      action: NOTE_ACTION,
    },
    select: { id: true },
  });

  if (!note) {
    return reply.code(404).send({ error: 'Заметка не найдена' });
  }

  await prisma.adminUserActionLog.delete({
    where: { id: note.id },
  });

  return reply.send({ ok: true });
}
