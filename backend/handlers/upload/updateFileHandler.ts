import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function updateFileHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  const { id } = req.params as { id: string };
  const { type } = req.body as { type: string };

  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const file = await prisma.uploadedFile.findUnique({
    where: { id },
  });

  if (!file || file.userId !== user.userId) {
    return reply.code(404).send({ error: 'Файл не найден или нет доступа' });
  }

  const updated = await prisma.uploadedFile.update({
    where: { id },
    data: { type },
  });

  return reply.send(updated);
}
