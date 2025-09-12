// src/handlers/certificates/issueCertificate.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';

interface IssueCertificateRoute extends RouteGenericInterface {
  Body: {
    email: string;
    title: string;
    number: string;
    issuedAt: string;       // ISO
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
  let { email, title, number, issuedAt, expiresAt, uploadedFileId } = req.body || {};
  if (!email || !title || !number || !issuedAt || !expiresAt || !uploadedFileId) {
    return reply.code(400).send({
      error: 'email, title, number, issuedAt, expiresAt, uploadedFileId обязательны',
    });
  }

  // легкая нормализация, чтобы не ловить невидимые дубли по пробелам
  email = String(email).trim();
  title = String(title).trim();
  number = String(number).trim();
  uploadedFileId = String(uploadedFileId).trim();

  const iss = new Date(issuedAt);
  const exp = new Date(expiresAt);
  const now = new Date();

  if (Number.isNaN(iss.getTime())) {
    return reply.code(422).send({ error: 'issuedAt должен быть корректной ISO-датой' });
  }
  if (Number.isNaN(exp.getTime())) {
    return reply.code(422).send({ error: 'expiresAt должен быть корректной ISO-датой' });
  }
  if (iss > now) {
    return reply.code(422).send({ error: 'issuedAt не может быть в будущем' });
  }
  if (exp <= iss) {
    return reply.code(422).send({ error: 'expiresAt должен быть позже issuedAt' });
  }

  // 3) Сущности
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return reply.code(404).send({ error: 'Пользователь не найден' });

  const file = await prisma.uploadedFile.findUnique({ where: { id: uploadedFileId } });
  if (!file) return reply.code(404).send({ error: 'Файл не найден' });

  // Предохранитель — нельзя повторно использовать файл
  const existingByFile = await prisma.certificate.findUnique({ where: { fileId: file.id } });
  if (existingByFile) {
    return reply.code(409).send({ error: 'Этот файл уже используется другим сертификатом' });
  }

  // Активная группа — по максимальному rank
  const ugs = await prisma.userGroup.findMany({
    where: { userId: user.id },
    include: { group: true },
  });
  if (!ugs.length) return reply.code(422).send({ error: 'У пользователя нет групп' });
  const activeGroup = ugs.reduce((a, b) => (a.group.rank >= b.group.rank ? a : b)).group;

  try {
    // 4) Транзакция
    const created = await prisma.$transaction(async (tx) => {
      // Идемпотентно переназначаем файл владельцу и типу
      if (file.userId !== user.id || file.type !== 'CERTIFICATE') {
        await tx.uploadedFile.update({
          where: { id: file.id },
          data: { userId: user.id, type: 'CERTIFICATE' },
        });
      }

      // Вставка по времени: найдём реальных соседей для новой issuedAt
      const prev = await tx.certificate.findFirst({
        where: {
          userId: user.id,
          groupId: activeGroup.id,
          issuedAt: { lt: iss },
        },
        orderBy: { issuedAt: 'desc' },
      });

      const next = await tx.certificate.findFirst({
        where: {
          userId: user.id,
          groupId: activeGroup.id,
          issuedAt: { gt: iss },
        },
        orderBy: { issuedAt: 'asc' },
      });

      // Создаём новый сертификат. previousId ставим на prev (если есть).
      const cert = await tx.certificate.create({
        data: {
          userId: user.id,
          groupId: activeGroup.id,
          fileId: file.id,
          issuedAt: iss,
          expiresAt: exp,
          isRenewal: !!prev,
          previousId: prev ? prev.id : null,
          confirmedById: actor.userId ?? null,
          number,
          title,
        },
        include: { group: true, file: true, confirmedBy: true },
      });

      // Если вставили "между" prev и next — перекидываем next.previousId на новый cert
      if (next) {
        await tx.certificate.update({
          where: { id: next.id },
          data: { previousId: cert.id },
        });
      }

      // Уведомление пользователю
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

    // 5) Ответ
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
        ? { id: (created.confirmedBy as any).id, email: (created.confirmedBy as any).email, fullName: (created.confirmedBy as any).fullName }
        : null,
      isActiveNow: now <= created.expiresAt,
      isExpired: now > created.expiresAt,
    });
  } catch (e: any) {
    // Превратим уникальные конфликты в 409 (чтобы фронт понимал)
    if (e?.code === 'P2002') {
      return reply.code(409).send({ error: 'duplicate_certificate', detail: 'Нарушено уникальное ограничение (fileId или previousId)' });
    }
    // Остальное — как 500
    req.log?.error?.(e);
    return reply.code(500).send({ error: 'Internal Server Error' });
  }
}
