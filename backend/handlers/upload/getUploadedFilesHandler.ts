import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';

export async function getUploadedFilesHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const query = req.query as { category?: string; pending?: string };
  const category = query.category?.trim().toLowerCase();
  const pending = query.pending === 'true';

  if (category && !/^[a-z0-9_-]+$/i.test(category)) {
    return reply.code(400).send({ error: 'Недопустимая категория файлов' });
  }

  if (pending && category !== 'documents') {
    return reply.code(400).send({ error: 'Фильтр pending поддерживается только для документов' });
  }

  const files = await prisma.uploadedFile.findMany({
    where: {
      userId,
      ...(category ? { fileId: { startsWith: `${userId}/${category}/` } } : {}),
      ...(pending
        ? {
            requestId: null,
            documentReviewFiles: { none: {} },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          }
        : {}),
    },
    orderBy: { createdAt: 'asc' },
  });

  return reply.send(files);
}
