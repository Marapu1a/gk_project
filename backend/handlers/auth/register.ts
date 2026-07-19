// handlers/auth/registerHandler.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma';
import { signJwt } from '../../utils/jwt';
import { registerSchema } from '../../schemas/auth';
import { PaymentType, PaymentStatus, NotificationType } from '@prisma/client';
import { reportOperationalFailure } from '../../lib/errorMonitoring';
import { getNextRegistrationNumber } from '../../utils/registrationNumber';
import { notifyAdmins } from '../../utils/notifications';

/** Канон: lower + убрать точки до @ (для всех доменов), без изменения хранимого email */
function canonicalSimple(emailInput: string): string {
  const s = String(emailInput).trim().toLowerCase();
  const at = s.lastIndexOf('@');
  if (at <= 0) return s;
  const local = s.slice(0, at).replace(/\./g, '');
  const domain = s.slice(at + 1);
  return `${local}@${domain}`;
}

/** Проверка дублей по канону в БД (без миграций) */
async function emailExistsByCanonSimple(emailInput: string): Promise<boolean> {
  const canon = canonicalSimple(emailInput);
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM "User"
      WHERE (replace(split_part(lower(email),'@',1), '.', '') || '@' || split_part(lower(email),'@',2)) = ${canon}
    ) AS exists;
  `;
  return rows[0]?.exists === true;
}

export async function registerHandler(req: FastifyRequest, reply: FastifyReply) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Некорректные данные', details: parsed.error.flatten() });
  }

  const {
    email,
    fullName,
    fullNameLatin,
    phone,
    birthDate,
    country,
    city,
    password,
    isExternalSupervisor,
  } = parsed.data;

  if (await emailExistsByCanonSimple(email)) {
    return reply.code(409).send({ error: 'Email уже используется' });
  }

  if (typeof fullNameLatin === 'string' && !fullNameLatin.trim()) {
    return reply.code(400).send({ error: 'ФИО латиницей не может быть пустым' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const studentGroup = await prisma.group.findFirst({ where: { name: 'Соискатель' } });
  if (!studentGroup) return reply.code(500).send({ error: 'Группа "Соискатель" не найдена' });

  const user = await prisma.$transaction(async (tx) => {
    const registrationNumber = await getNextRegistrationNumber(tx as any);

    const user = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        fullNameLatin: fullNameLatin?.trim() || null,
        registrationNumber,
        phone,
        birthDate: birthDate ? new Date(birthDate) : null,
        country: country || null,
        city: city || null,
        role: 'STUDENT',
        targetLevel: null,
        targetLockRank: null,
        externalSupervisorClaimStatus: isExternalSupervisor ? 'PENDING' : 'NONE',
        externalSupervisorClaimedAt: isExternalSupervisor ? new Date() : null,
      },
    });

    await tx.payment.createMany({
      data: [
        PaymentType.DOCUMENT_REVIEW,
        PaymentType.EXAM_ACCESS,
        PaymentType.REGISTRATION,
        PaymentType.FULL_PACKAGE,
      ].map((type) => ({
        userId: user.id,
        type,
        status: PaymentStatus.UNPAID,
      })),
    });

    await tx.userGroup.create({
      data: { userId: user.id, groupId: studentGroup.id },
    });

    return user;
  });

  // нотификации админам — как было (вне транзакции)
  try {
    await notifyAdmins({
      type: NotificationType.NEW_USER,
      message: isExternalSupervisor
        ? `Новый пользователь указал, что уже является супервизором IBAO (BCBA): ${user.email}`
        : `Новая регистрация: ${user.email}`,
      link: `/admin/users/${encodeURIComponent(user.id)}`,
    });
  } catch (e) {
    reportOperationalFailure(
      'new_user_admin_notification',
      e,
      { userId: user.id, requestId: req.id },
      req.log,
    );
  }

  const token = signJwt({ userId: user.id, role: user.role });

  return reply.send({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      fullNameLatin: (user as any).fullNameLatin ?? null,
      registrationNumber: user.registrationNumber,
    },
  });
}
