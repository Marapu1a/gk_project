// src/handlers/certificates/deleteCertificate.ts
import { FastifyReply, FastifyRequest, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';
import fs from 'fs/promises';
import path from 'path';

interface DeleteCertificateRoute extends RouteGenericInterface {
  Params: { id: string };
  Body: { deleteFile?: boolean }; // по умолчанию true
}

const UPLOAD_DIR = process.env.UPLOAD_DIR; // как в deleteFileHandler

export async function deleteCertificateHandler(
  req: FastifyRequest<DeleteCertificateRoute>,
  reply: FastifyReply
) {
  // только админ
  const actor = (req as any).user;
  if (!actor?.userId) return reply.code(401).send({ error: 'Не авторизован' });
  const me = await prisma.user.findUnique({ where: { id: actor.userId }, select: { role: true } });
  if (me?.role !== 'ADMIN') return reply.code(403).send({ error: 'Нет доступа' });

  const { id } = req.params || {};
  if (!id) return reply.code(400).send({ error: 'id обязателен' });

  // тянем сертификат с файлом
  const cert = await prisma.certificate.findUnique({
    where: { id },
    include: {
      file: { select: { id: true, fileId: true } }, // fileId — относительный путь внутри /uploads
    },
  });
  if (!cert) return reply.code(404).send({ error: 'Сертификат не найден' });

  const deleteFile = req.body?.deleteFile !== false; // по умолчанию удаляем файл
  const fileRecord = cert.file ?? null;

  try {
    // транзакция: починить цепочку -> удалить сертификат -> удалить запись файла
    await prisma.$transaction(async (tx) => {
      // найти следующего (у кого previousId = текущий)
      const next = await tx.certificate.findFirst({
        where: { previousId: cert.id },
        select: { id: true },
      });

      if (next) {
        // перевесить на prev (может быть null)
        await tx.certificate.update({
          where: { id: next.id },
          data: { previousId: cert.previousId ?? null },
        });
      }

      await tx.certificate.delete({ where: { id: cert.id } });

      if (deleteFile && fileRecord) {
        // удаляем запись файла (физику — после коммита)
        await tx.uploadedFile.delete({ where: { id: fileRecord.id } });
      }
    });
  } catch (e: any) {
    req.log?.error?.(e);
    return reply.code(500).send({ error: 'Internal Server Error' });
  }

  // физическое удаление файла — после успешной транзакции, тем же путём что в deleteFileHandler
  if (deleteFile && fileRecord?.fileId) {
    const baseDir = UPLOAD_DIR
      ? path.resolve(UPLOAD_DIR)
      : path.resolve(process.cwd(), '..', 'frontend', 'public', 'uploads');

    const filePath = path.join(baseDir, fileRecord.fileId);
    try {
      await fs.unlink(filePath);
    } catch {
      // файл мог уже отсутствовать — не критично
    }
  }

  return reply.code(204).send();
}
