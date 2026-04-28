// src/handlers/certificates/issueCertificate.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';
import {
  CycleStatus,
  TargetLevel,
  RecordStatus,
  PaymentType,
  PaymentStatus,
  CycleType,
} from '@prisma/client';

interface IssueCertificateRoute extends RouteGenericInterface {
  Body: {
    email: string;
    title: string;
    number: string;
    issuedAt: string; // ISO
    expiresAt: string; // ISO
    uploadedFileId: string; // UploadedFile.id
  };
}

const GROUP_NAME_BY_TARGET: Record<TargetLevel, 'Инструктор' | 'Куратор' | 'Супервизор'> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

function roleByGroupName(groupName: string): 'STUDENT' | 'REVIEWER' {
  return groupName === 'Супервизор' || groupName === 'Опытный Супервизор' ? 'REVIEWER' : 'STUDENT';
}

function resolveIssuedGroupName(
  cycleType: CycleType,
  targetLevel: TargetLevel
): 'Инструктор' | 'Куратор' | 'Супервизор' | 'Опытный Супервизор' {
  if (cycleType === CycleType.RENEWAL && targetLevel === TargetLevel.SUPERVISOR) {
    return 'Опытный Супервизор';
  }

  return GROUP_NAME_BY_TARGET[targetLevel];
}

function getChainGroupNames(
  targetLevel: TargetLevel
): Array<'Инструктор' | 'Куратор' | 'Супервизор' | 'Опытный Супервизор'> {
  if (targetLevel === TargetLevel.SUPERVISOR) {
    return ['Супервизор', 'Опытный Супервизор'];
  }

  return [GROUP_NAME_BY_TARGET[targetLevel]];
}

function resolveRenewalTargetLevel(
  issuedGroupName: 'Инструктор' | 'Куратор' | 'Супервизор' | 'Опытный Супервизор'
): TargetLevel {
  if (issuedGroupName === 'Инструктор') return TargetLevel.INSTRUCTOR;
  if (issuedGroupName === 'Куратор') return TargetLevel.CURATOR;
  return TargetLevel.SUPERVISOR;
}

export async function issueCertificateHandler(
  req: FastifyRequest<IssueCertificateRoute>,
  reply: FastifyReply
) {
  const actor = (req as any).user;
  if (!actor?.userId) return reply.code(401).send({ error: 'Не авторизован' });

  const admin = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { role: true },
  });
  if (admin?.role !== 'ADMIN') return reply.code(403).send({ error: 'Нет доступа' });

  let { email, title, number, issuedAt, expiresAt, uploadedFileId } = req.body || ({} as any);
  if (!email || !title || !number || !issuedAt || !expiresAt || !uploadedFileId) {
    return reply.code(400).send({
      error: 'email, title, number, issuedAt, expiresAt, uploadedFileId обязательны',
    });
  }

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
    return reply.code(422).send({ error: 'expiresAt должен быть позже issuedAt' });
  }
  if (iss > now) return reply.code(422).send({ error: 'issuedAt не может быть в будущем' });
  if (exp <= iss) return reply.code(422).send({ error: 'expiresAt должен быть позже issuedAt' });

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    orderBy: [{ email: 'asc' }, { id: 'asc' }],
  });
  if (!user) return reply.code(404).send({ error: 'Пользователь не найден' });

  const file = await prisma.uploadedFile.findUnique({ where: { id: uploadedFileId } });
  if (!file) return reply.code(404).send({ error: 'Файл не найден' });

  const existingByFile = await prisma.certificate.findUnique({ where: { fileId: file.id } });
  if (existingByFile) {
    return reply.code(409).send({ error: 'Этот файл уже используется другим сертификатом' });
  }

  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId: user.id, status: CycleStatus.ACTIVE },
    select: { id: true, targetLevel: true, type: true },
  });
  if (!activeCycle) return reply.code(400).send({ error: 'NO_ACTIVE_CYCLE' });

  const issuedGroupName = resolveIssuedGroupName(activeCycle.type, activeCycle.targetLevel);
  const renewalTargetLevel = resolveRenewalTargetLevel(issuedGroupName);

  const targetGroup = await prisma.group.findUnique({ where: { name: issuedGroupName } });
  if (!targetGroup) return reply.code(500).send({ error: 'TARGET_GROUP_NOT_CONFIGURED' });

  const chainGroupNames = getChainGroupNames(activeCycle.targetLevel);
  const chainGroups = await prisma.group.findMany({
    where: { name: { in: chainGroupNames } },
    select: { id: true, name: true },
  });

  const chainGroupIds = chainGroups.map((g) => g.id);
  if (!chainGroupIds.length) {
    return reply.code(500).send({ error: 'CERTIFICATE_CHAIN_GROUPS_NOT_CONFIGURED' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const already = await tx.certificate.findUnique({
        where: { cycleId: activeCycle.id },
        select: { id: true },
      });
      if (already) {
        const err: any = new Error('CYCLE_ALREADY_HAS_CERTIFICATE');
        err.code = 'CYCLE_ALREADY_HAS_CERTIFICATE';
        throw err;
      }

      if (file.userId !== user.id || file.type !== 'CERTIFICATE') {
        await tx.uploadedFile.update({
          where: { id: file.id },
          data: { userId: user.id, type: 'CERTIFICATE' },
        });
      }

      const prev = await tx.certificate.findFirst({
        where: {
          userId: user.id,
          groupId: { in: chainGroupIds },
          issuedAt: { lt: iss },
        },
        orderBy: { issuedAt: 'desc' },
      });

      const next = await tx.certificate.findFirst({
        where: {
          userId: user.id,
          groupId: { in: chainGroupIds },
          issuedAt: { gt: iss },
        },
        orderBy: { issuedAt: 'asc' },
      });

      const cert = await tx.certificate.create({
        data: {
          userId: user.id,
          groupId: targetGroup.id,
          fileId: file.id,
          issuedAt: iss,
          expiresAt: exp,
          isRenewal: activeCycle.type === CycleType.RENEWAL,
          previousId: prev ? prev.id : null,
          confirmedById: actor.userId ?? null,
          number,
          title,
          cycleId: activeCycle.id,
        },
        include: { group: true, file: true, confirmedBy: true, cycle: true },
      });

      if (next) {
        await tx.certificate.update({
          where: { id: next.id },
          data: { previousId: cert.id },
        });
      }

      await tx.certificationCycle.update({
        where: { id: activeCycle.id },
        data: {
          status: CycleStatus.COMPLETED,
          endedAt: iss,
        },
      });

      const spentRes = await tx.cEUEntry.updateMany({
        where: {
          status: RecordStatus.CONFIRMED,
          record: { cycleId: activeCycle.id },
        },
        data: {
          status: RecordStatus.SPENT,
          reviewedAt: new Date(),
        },
      });

      await tx.userGroup.deleteMany({ where: { userId: user.id } });
      await tx.userGroup.create({
        data: { userId: user.id, groupId: targetGroup.id },
      });

      const newRole = roleByGroupName(targetGroup.name);

      await tx.user.update({
        where: { id: user.id },
        data: {
          targetLevel: null,
          targetLockRank: null,
          ...(user.role !== 'ADMIN' ? { role: newRole } : {}),
        },
      });

      const paymentsReset = await tx.payment.updateMany({
        where: {
          userId: user.id,
          status: { in: [PaymentStatus.PAID, PaymentStatus.PENDING, PaymentStatus.UNPAID] },
        },
        data: {
          status: PaymentStatus.UNPAID,
          confirmedAt: null,
          comment: 'Сброшено после выдачи сертификата',
        },
      });

      await tx.payment.deleteMany({
        where: {
          userId: user.id,
          type: PaymentType.RENEWAL,
        },
      });

      const createdRenewal = await tx.payment.create({
        data: {
          userId: user.id,
          type: PaymentType.RENEWAL,
          targetLevel: renewalTargetLevel,
          status: PaymentStatus.UNPAID,
          comment: 'Создано после выдачи сертификата',
        },
        select: { id: true },
      });

      const renewalPaymentId = createdRenewal.id;

      await tx.notification.create({
        data: {
          userId: user.id,
          type: 'DOCUMENT',
          message: `Выдан сертификат "${cert.title}" №${cert.number}`,
          link: '/my-certificate',
        },
      });

      return {
        cert,
        spentCount: spentRes.count,
        paymentsResetCount: paymentsReset.count,
        renewalPaymentId,
      };
    });

    const created = result.cert;

    return reply.code(201).send({
      id: created.id,
      title: created.title,
      number: created.number,
      issuedAt: created.issuedAt,
      expiresAt: created.expiresAt,
      isRenewal: created.isRenewal,
      previousId: created.previousId,
      cycleId: created.cycleId,
      group: { id: created.group.id, name: created.group.name, rank: created.group.rank },
      file: { id: created.file.id, name: created.file.name, fileId: created.file.fileId },
      confirmedBy: created.confirmedBy
        ? {
          id: (created.confirmedBy as any).id,
          email: (created.confirmedBy as any).email,
          fullName: (created.confirmedBy as any).fullName,
        }
        : null,
      isActiveNow: now <= created.expiresAt,
      isExpired: now > created.expiresAt,
      closedCycleId: created.cycleId,
      spentCeuCount: result.spentCount,
      paymentsResetCount: result.paymentsResetCount,
      renewalPaymentId: result.renewalPaymentId,
    });
  } catch (e: any) {
    if (e?.code === 'CYCLE_ALREADY_HAS_CERTIFICATE') {
      return reply.code(409).send({ error: 'CYCLE_ALREADY_HAS_CERTIFICATE' });
    }
    if (e?.code === 'P2002') {
      return reply.code(409).send({
        error: 'duplicate_certificate',
        detail: 'Нарушено уникальное ограничение (fileId или previousId или cycleId)',
      });
    }
    req.log?.error?.(e);
    return reply.code(500).send({ error: 'Internal Server Error' });
  }
}
