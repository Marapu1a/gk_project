import { FastifyReply, FastifyRequest, RouteGenericInterface } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../../../lib/prisma';

const UPLOAD_DIR = process.env.UPLOAD_DIR;

interface DeleteCEURecordAdminRoute extends RouteGenericInterface {
  Params: { recordId: string };
}

async function deletePhysicalFile(fileId: string) {
  const baseDir = UPLOAD_DIR
    ? path.resolve(UPLOAD_DIR)
    : path.resolve(process.cwd(), '..', 'frontend', 'public', 'uploads');

  try {
    await fs.unlink(path.join(baseDir, fileId));
  } catch {
    // Битые CEU-записи часто указывают на уже отсутствующие файлы.
  }
}

export async function deleteCEURecordAdminHandler(
  req: FastifyRequest<DeleteCEURecordAdminRoute>,
  reply: FastifyReply,
) {
  const adminId = req.user?.userId;
  const role = req.user?.role;
  const { recordId } = req.params;

  if (!adminId || role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Только администратор может удалить CEU-запись' });
  }

  const record = await prisma.cEURecord.findUnique({
    where: { id: recordId },
    select: {
      id: true,
      userId: true,
      fileId: true,
      eventName: true,
      entries: { select: { id: true, status: true } },
    },
  });

  if (!record) {
    return reply.code(404).send({ error: 'CEU-запись не найдена' });
  }

  if (record.entries.some((entry) => entry.status === 'SPENT')) {
    return reply.code(400).send({ error: 'Использованные CEU-записи нельзя удалить' });
  }

  const physicalFileIdToDelete = await prisma.$transaction(async (tx) => {
    const uploadedFile = record.fileId
      ? await tx.uploadedFile.findUnique({
          where: { fileId: record.fileId },
          select: {
            id: true,
            fileId: true,
            requestId: true,
            certificate: { select: { id: true } },
            supervisionContract: { select: { id: true } },
            _count: { select: { documentReviewFiles: true } },
          },
        })
      : null;

    await tx.cEUEntry.deleteMany({ where: { recordId: record.id } });
    await tx.cEURecord.delete({ where: { id: record.id } });

    let physicalFileId: string | null = null;

    if (uploadedFile) {
      const otherCEURecordsWithSameFile = await tx.cEURecord.count({
        where: { fileId: uploadedFile.fileId },
      });

      const canDeleteUploadedFile =
        otherCEURecordsWithSameFile === 0 &&
        uploadedFile._count.documentReviewFiles === 0 &&
        !uploadedFile.requestId &&
        !uploadedFile.certificate &&
        !uploadedFile.supervisionContract;

      if (canDeleteUploadedFile) {
        physicalFileId = uploadedFile.fileId;
        await tx.uploadedFile.delete({ where: { id: uploadedFile.id } });
      }
    }

    await tx.adminUserActionLog.create({
      data: {
        userId: record.userId,
        adminId,
        action: 'Удалил CEU-запись',
        details: [
          `Запись: ${record.eventName || record.id}`,
          `Начислений: ${record.entries.length}`,
          physicalFileId ? 'Файл удален' : 'Файл не удалялся или не найден',
        ].join('; '),
      },
    });

    return physicalFileId;
  });

  if (physicalFileIdToDelete) {
    await deletePhysicalFile(physicalFileIdToDelete);
  }

  return reply.send({ ok: true, fileDeleted: Boolean(physicalFileIdToDelete) });
}
