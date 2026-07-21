// handlers/files/uploadFileToStorage.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { CycleStatus } from '@prisma/client';
import {
  calculateFileContentHash,
  findCeuFileDuplicate,
} from '../../domain/ceu/duplicateFile';

import { UPLOAD_ROOT, MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES } from '../../config/storage';
import { isPdfBuffer } from '../../utils/pdfValidation';

const MAX_PENDING_DOCUMENT_FILES = 10;
const PENDING_DOCUMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function uploadFileToStorage(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user as any;
  if (!user?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  let data;
  try {
    data = await req.file({
      limits: { fileSize: MAX_FILE_SIZE_BYTES } // обязательное условие!
    });
  } catch (e: any) {
    req.log.warn({ err: e, requestId: req.id }, 'Upload rejected by multipart limit');
    return reply.code(413).send({ error: `Файл превышает ${MAX_FILE_SIZE_MB}MB` });
  }

  if (!data) return reply.code(400).send({ error: 'Файл не получен' });

  // ⬅️ теперь это реально работает
  if (data.file.truncated) {
    return reply.code(413).send({ error: `Файл превышает ${MAX_FILE_SIZE_MB}MB` });
  }

  const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
  if (!allowed.includes(data.mimetype)) {
    return reply.code(415).send({ error: 'Недопустимый тип файла' });
  }

  const category = String((req.query as any).category ?? 'misc').toLowerCase();
  const targetUserIdRaw = (req.query as any).targetUserId;
  const targetUserId =
    typeof targetUserIdRaw === 'string' && targetUserIdRaw.trim()
      ? targetUserIdRaw.trim()
      : null;
  const ownerUserId =
    targetUserId && category === 'avatar' && user.role === 'ADMIN'
      ? targetUserId
      : user.userId;

  if (!/^[a-z0-9_-]+$/i.test(category))
    return reply.code(400).send({ error: 'Недопустимая категория файлов' });

  if (targetUserId && (category !== 'avatar' || user.role !== 'ADMIN')) {
    return reply.code(403).send({ error: 'Нельзя загружать файл за другого пользователя' });
  }

  if (targetUserId && category === 'avatar') {
    const targetUser = await prisma.user.findUnique({
      where: { id: ownerUserId },
      select: { id: true },
    });
    if (!targetUser) return reply.code(404).send({ error: 'Пользователь не найден' });
  }

  if (category === 'documents') {
    const pendingCount = await prisma.uploadedFile.count({
      where: {
        userId: ownerUserId,
        fileId: { startsWith: `${ownerUserId}/documents/` },
        requestId: null,
        documentReviewFiles: { none: {} },
        createdAt: { gte: new Date(Date.now() - PENDING_DOCUMENT_WINDOW_MS) },
      },
    });
    if (pendingCount >= MAX_PENDING_DOCUMENT_FILES) {
      return reply.code(400).send({
        error: `Можно загрузить максимум ${MAX_PENDING_DOCUMENT_FILES} документов за одну отправку`,
      });
    }
  }

  const buffer = await data.toBuffer();
  if (category === 'certificate' && !isPdfBuffer(buffer)) {
    return reply.code(415).send({ error: 'Файл сертификата поврежден или не является PDF' });
  }

  const contentHash = calculateFileContentHash(buffer);

  if (category === 'ceu') {
    const activeCycle = await prisma.certificationCycle.findFirst({
      where: { userId: ownerUserId, status: CycleStatus.ACTIVE },
      select: { id: true },
    });

    if (activeCycle) {
      const duplicate = await findCeuFileDuplicate(prisma, {
        userId: ownerUserId,
        cycleId: activeCycle.id,
        contentHash,
      });

      if (duplicate) {
        return reply.code(409).send({
          error: 'CEU_FILE_DUPLICATE',
          duplicate: {
            recordId: duplicate.recordId,
            eventName: duplicate.eventName,
            eventDate: duplicate.eventDate,
          },
        });
      }
    }
  }

  const ext = path.extname(data.filename).replace(/[^a-zA-Z0-9.]/g, '');
  const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

  const baseDir = UPLOAD_ROOT;

  const dir = path.join(baseDir, String(ownerUserId), category);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), buffer);

  const fileId = `${ownerUserId}/${category}/${fileName}`;

  let uploaded;
  try {
    uploaded = await prisma.uploadedFile.create({
      data: {
        userId: ownerUserId,
        fileId,
        contentHash,
        name: data.filename,
        mimeType: data.mimetype,
      },
    });
  } catch (error) {
    await fs.unlink(path.join(dir, fileName)).catch(() => undefined);
    throw error;
  }

  return reply.code(201).send(uploaded);
}
