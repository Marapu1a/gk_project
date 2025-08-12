// src/handlers/certificates/issueCertificate.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

interface IssueCertificateRoute extends RouteGenericInterface {
  Body: {
    email: string;
    title: string;
    number: string;
    expiresAt: string;      // ISO
    uploadedFileId: string; // UploadedFile.id
  };
}

export async function issueCertificateHandler(
  req: FastifyRequest<IssueCertificateRoute>,
  reply: FastifyReply
) {
  // 1) Аутентификация/авторизация
  const actor = (req as any).user;
  if (!actor?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  const admin = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { role: true },
  });
  if (admin?.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Нет доступа' });
  }

  // 2) Валидация входа
  const { email, title, number, expiresAt, uploadedFileId } = req.body || {};
  if (!email || !title || !number || !expiresAt || !uploadedFileId) {
    return reply.code(400).send({
      error: 'email, title, number, expiresAt, uploadedFileId обязательны',
    });
  }

  const now = new Date();
  const exp = new Date(expiresAt);
  if (Number.isNaN(exp.getTime()) || exp <= now) {
    return reply.code(422).send({ error: 'expiresAt должен быть будущей датой (ISO)' });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return reply.code(404).send({ error: 'Пользователь не найден' });

  const file = await prisma.uploadedFile.findUnique({ where: { id: uploadedFileId } });
  if (!file) return reply.code(404).send({ error: 'Файл не найден' });

  // Файл уже привязан к сертификату?
  const existingByFile = await prisma.certificate.findUnique({ where: { fileId: file.id } as any });
  if (existingByFile) {
    return reply.code(409).send({ error: 'Этот файл уже используется другим сертификатом' });
  }

  // Активная группа — максимальный rank
  const ugs = await prisma.userGroup.findMany({ where: { userId: user.id }, include: { group: true } });
  if (!ugs.length) return reply.code(422).send({ error: 'У пользователя нет групп' });
  const activeGroup = ugs.reduce((a, b) => (a.group.rank >= b.group.rank ? a : b)).group;

  // 3) Транзакция
  const created = await prisma.$transaction(async (tx) => {
    // Переназначаем владельца файла и помечаем типом CERTIFICATE (идемпотентно)
    if (file.userId !== user.id || file.type !== 'CERTIFICATE') {
      await tx.uploadedFile.update({
        where: { id: file.id },
        data: {
          userId: user.id,
          type: 'CERTIFICATE',
        },
      });
    }

    const prev = await tx.certificate.findFirst({
      where: { userId: user.id, groupId: activeGroup.id },
      orderBy: { issuedAt: 'desc' },
    });

    const cert = await tx.certificate.create({
      data: {
        userId: user.id,
        groupId: activeGroup.id,
        fileId: file.id,            // связь на UploadedFile.id
        issuedAt: now,
        expiresAt: exp,
        isRenewal: !!prev,
        previousId: prev ? prev.id : null,
        confirmedById: actor.userId ?? null,
        number,
        title,
      },
      include: { group: true, file: true, confirmedBy: true },
    });

    if (prev) {
      await tx.certificate.update({
        where: { id: prev.id },
        data: { next: { connect: { id: cert.id } } },
      });
    }

    await tx.notification.create({
      data: {
        userId: user.id,
        type: 'DOCUMENT',
        message: `Выдан сертификат "${cert.title}" №${cert.number}`,
        link: '/my-certificate',
      },
    });

    return cert;
  });

  // 4) Ответ
  return reply.code(201).send({
    id: created.id,
    title: created.title,
    number: created.number,
    issuedAt: created.issuedAt,
    expiresAt: created.expiresAt,
    isRenewal: created.isRenewal,
    previousId: created.previousId,
    group: { id: created.group.id, name: created.group.name, rank: created.group.rank },
    file: { id: created.file.id, name: created.file.name, fileId: created.file.fileId },
    confirmedBy: created.confirmedBy
      ? { id: created.confirmedBy.id, email: created.confirmedBy.email, fullName: created.confirmedBy.fullName }
      : null,
    isActiveNow: now <= created.expiresAt,
    isExpired: now > created.expiresAt,
  });
}
