import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { addUserToGroup, isUserInGroup } from '../../utils/group';

export async function createCertificate(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user;
  if (!user || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  const { email, level, issuedAt, expiresAt, fileUrl } = req.body as {
    email: string;
    level: string;
    issuedAt: string;
    expiresAt: string;
    fileUrl: string;
  };

  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) return reply.code(404).send({ error: 'Пользователь не найден' });

  // 1. Деактивировать предыдущие активные
  await prisma.certificate.updateMany({
    where: { userId: targetUser.id, isActive: true },
    data: { isActive: false, status: 'EXPIRED' },
  });

  // 2. Сбросить activeForUserId у всех
  await prisma.certificate.updateMany({
    where: { activeForUserId: targetUser.id },
    data: { activeForUserId: null },
  });

  // 3. Найти предыдущий сертификат для проверки продления
  const previous = await prisma.certificate.findFirst({
    where: { userId: targetUser.id },
    orderBy: { issuedAt: 'desc' },
  });

  const isSameLevelRenewal = previous?.level === level;

  // 4. Пометить CEU как потраченные
  await prisma.cEURecord.updateMany({
    where: {
      userId: targetUser.id,
      is_valid: true,
      spentOnCertificate: false,
    },
    data: {
      spentOnCertificate: true,
    },
  });

  // 5. Создать новый сертификат
  const cert = await prisma.certificate.create({
    data: {
      userId: targetUser.id,
      level,
      issuedAt: new Date(issuedAt),
      expiresAt: new Date(expiresAt),
      fileUrl,
      isActive: true,
      status: 'ACTIVE',
      activeForUserId: targetUser.id,
    },
  });

  // 6. Проверка до добавления в основную группу
  const alreadyInMainGroup = await isUserInGroup(targetUser.id, level);

  // 7. Добавить в основную группу
  await addUserToGroup(targetUser.id, level);

  // 8. Если это продление и пользователь уже был в группе — добавить в опытную
  if (isSameLevelRenewal && alreadyInMainGroup) {
    await addUserToGroup(targetUser.id, `Опытный ${level}`);
  }

  // 9. Ответ
  reply.send({
    success: true,
    certificate: cert,
    extended: isSameLevelRenewal,
  });
}
