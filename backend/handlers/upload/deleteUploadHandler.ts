// backend/src/handlers/upload/deleteUploadHandler.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import path from 'path';
import fs from 'fs/promises';

export async function deleteUploadHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user;
  const { fileId } = req.params as { fileId: string };

  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  if (!fileId || !fileId.startsWith(`uploads/${user.userId}/`)) {
    return reply.code(400).send({ error: 'Некорректный fileId' });
  }

  const filePath = path.resolve(__dirname, '../../../', fileId);

  try {
    await fs.unlink(filePath);
    return reply.send({ success: true });
  } catch (err) {
    return reply.code(404).send({ error: 'Файл не найден или уже удалён' });
  }
}
