import { FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../../lib/prisma';

const UPLOAD_DIR = process.env.UPLOAD_DIR; // на серве есть, локально отсутствует

export async function deleteFileHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  const { id } = req.params as { id: string };

  if (!user?.userId) {
    return reply.code(401).send({ error: 'Не авторизован' });
  }

  const file = await prisma.uploadedFile.findUnique({ where: { id } });
  if (!file) {
    return reply.code(404).send({ error: 'Файл не найден' });
  }

  // доступ: владелец или админ
  if (file.userId !== user.userId && user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Нет доступа к этому файлу' });
  }

  // ❗ фикс бага — CEU ищем по file.fileId, а не по id
  const usedInCeu = await prisma.cEURecord.findFirst({ where: { fileId: file.fileId } });
  if (usedInCeu) {
    return reply.code(400).send({ error: 'Файл уже прикреплён к заявке и не может быть удалён' });
  }

  // путь до файла
  const baseDir = UPLOAD_DIR
    ? path.resolve(UPLOAD_DIR)
    : path.resolve(process.cwd(), '..', 'frontend', 'public', 'uploads');

  const filePath = path.join(baseDir, file.fileId);

  try {
    await fs.unlink(filePath);
  } catch {
    // файл мог уже отсутствовать — игнорируем
  }

  await prisma.uploadedFile.delete({ where: { id } });

  return reply.send({ success: true });
}
