import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function getUploadedFilesHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const files = await prisma.uploadedFile.findMany({
    where: { userId },
  });

  return reply.send(files);
}
