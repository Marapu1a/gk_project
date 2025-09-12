// handlers/auth/registerHandler.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma';
import { signJwt } from '../../utils/jwt';
import { registerSchema } from '../../schemas/auth';
import { PaymentType, PaymentStatus, NotificationType } from '@prisma/client';

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
    return reply
      .code(400)
      .send({ error: 'Некорректные данные', details: parsed.error.flatten() });
  }

  const { email, fullName, phone, password } = parsed.data;

  // Жёсткая проверка дублей по канону (регистр игнорируем, точки в local-part игнорируем)
  if (await emailExistsByCanonSimple(email)) {
    return reply.code(409).send({ error: 'Email уже используется' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email, // сохраняем как ввёл пользователь
      password: hashedPassword,
      fullName,
      phone,
      role: 'STUDENT',
    },
  });

  // Добавляем все типы оплаты
  await prisma.payment.createMany({
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

  const studentGroup = await prisma.group.findFirst({
    where: { name: 'Студент' },
  });

  if (!studentGroup) {
    return reply.code(500).send({ error: 'Группа "Студент" не найдена' });
  }

  await prisma.userGroup.create({
    data: {
      userId: user.id,
      groupId: studentGroup.id,
    },
  });

  // 🔔 Уведомляем всех админов о новой регистрации (best-effort)
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    if (admins.length) {
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: NotificationType.NEW_USER,
          message: `Новая регистрация: ${user.email}`,
          link: `/admin/users/${encodeURIComponent(user.id)}`,
        })),
      });
    }
  } catch (e) {
    req.log.error(e, 'NEW_USER notifications createMany failed');
  }

  const token = signJwt({ userId: user.id, role: user.role });

  return reply.send({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
  });
}
