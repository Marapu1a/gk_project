import { FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../../lib/prisma';

const UPLOAD_DIR = process.env.UPLOAD_DIR;

export async function deleteSupervisionContractHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  const actorRole = req.user?.role;
  const { id } = req.params as { id: string };

  if (!userId) return reply.code(401).send({ error: 'Не авторизован' });

  const contract = await prisma.supervisionContract.findUnique({
    where: { id },
    include: { file: true },
  });

  if (!contract) {
    return reply.code(404).send({ error: 'Контракт не найден' });
  }

  if (contract.userId !== userId && actorRole !== 'ADMIN') {
    return reply.code(403).send({ error: 'Нет доступа к этому контракту' });
  }

  await prisma.$transaction(async (tx) => {
    await tx.supervisionContract.delete({ where: { id } });
    await tx.uploadedFile.delete({ where: { id: contract.fileId } });
  });

  const baseDir = UPLOAD_DIR
    ? path.resolve(UPLOAD_DIR)
    : path.resolve(process.cwd(), '..', 'frontend', 'public', 'uploads');

  try {
    await fs.unlink(path.join(baseDir, contract.file.fileId));
  } catch {
    // Файл уже мог отсутствовать на диске; запись в БД удалена, этого достаточно.
  }

  return reply.send({ success: true });
}

