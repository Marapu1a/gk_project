import { FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../../lib/prisma';

export async function deleteFileHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  const { id } = req.params as { id: string };

  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const file = await prisma.uploadedFile.findUnique({
    where: { id },
  });

  if (!file) {
    return reply.code(404).send({ error: 'Файл не найден' });
  }

  // ✅ Проверка владельца или админа
  if (file.userId !== user.userId && user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Нет доступа к этому файлу' });
  }

  // ⛔ Блокируем удаление, если файл уже используется в заявке
  const usedInCeu = await prisma.cEURecord.findFirst({
    where: { fileId: id },
  });

  if (usedInCeu) {
    return reply.code(400).send({ error: 'Файл уже прикреплён к заявке и не может быть удалён' });
  }

  const filePath = path.join(process.cwd(), '..', 'frontend', 'public', 'uploads', file.fileId);

  try {
    await fs.unlink(filePath);
  } catch {
    // Файл уже удалён – игнорируем
  }

  await prisma.uploadedFile.delete({
    where: { id },
  });

  return reply.send({ success: true });
}
