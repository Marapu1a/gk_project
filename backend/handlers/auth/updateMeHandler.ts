import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { updateMeSchema } from '../../schemas/updateMe.schema';

function toISOFromDateOnly(dateOnly: string) {
  const [y, m, d] = dateOnly.split('-').map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1)).toISOString();
}

export async function updateMeHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) return reply.code(401).send({ error: 'Не авторизован' });

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { archivedAt: true },
  });
  if (!currentUser) return reply.code(404).send({ error: 'Пользователь не найден' });
  if (currentUser.archivedAt) {
    return reply.code(403).send({
      error: 'Аккаунт удалён, для восстановления свяжитесь с нами',
    });
  }

  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }
  const body = parsed.data;

  // Для очищаемых строковых полей: null или пустая строка → очистка (null), иначе trim.
  const clearableString = (value: string | null | undefined) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  };

  let birthDate: string | null | undefined;
  if (body.birthDate === undefined) {
    birthDate = undefined;
  } else if (!body.birthDate) {
    birthDate = null; // null или '' → очистка
  } else {
    birthDate = /^\d{4}-\d{2}-\d{2}$/.test(body.birthDate)
      ? toISOFromDateOnly(body.birthDate)
      : new Date(body.birthDate).toISOString();
  }

  const data: Record<string, any> = {};
  // Обязательные поля: пишем только при наличии непустого значения.
  if (body.fullName !== undefined) data.fullName = body.fullName.trim();
  if (body.fullNameLatin !== undefined) data.fullNameLatin = body.fullNameLatin.trim();
  if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl.trim();
  // Очищаемые поля: null/'' → null, иначе trim.
  if (body.phone !== undefined) data.phone = clearableString(body.phone);
  if (birthDate !== undefined) data.birthDate = birthDate;
  if (body.country !== undefined) data.country = clearableString(body.country);
  if (body.city !== undefined) data.city = clearableString(body.city);
  if (body.bio !== undefined) data.bio = clearableString(body.bio);
  if (body.ibaoId !== undefined) data.ibaoId = clearableString(body.ibaoId);

  if (Object.keys(data).length === 0) {
    return reply.code(400).send({ error: 'Нет данных для обновления' });
  }

  await prisma.user.update({ where: { id: userId }, data });

  const updated = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      fullName: true,
      fullNameLatin: true,
      registrationNumber: true,
      phone: true,
      birthDate: true,
      country: true,
      city: true,
      avatarUrl: true,
      bio: true,
      ibaoId: true,
      targetLevel: true,       // ← добавлено
      targetLockRank: true,    // ← добавлено
      groups: { include: { group: { select: { id: true, name: true, rank: true } } } },
    },
  });
  if (!updated) return reply.code(404).send({ error: 'Пользователь не найден' });

  const groupList = updated.groups
    .map(({ group }) => ({ id: group.id, name: group.name, rank: group.rank }))
    .sort((a, b) => b.rank - a.rank);

  const activeGroup = groupList[0]
    ? { id: groupList[0].id, name: groupList[0].name, rank: groupList[0].rank }
    : null;

  return reply.send({
    id: updated.id,
    email: updated.email,
    role: updated.role,
    fullName: updated.fullName,
    fullNameLatin: updated.fullNameLatin,
    registrationNumber: updated.registrationNumber,
    phone: updated.phone,
    birthDate: updated.birthDate,
    country: updated.country,
    city: updated.city,
    avatarUrl: updated.avatarUrl,
    bio: updated.bio,
    ibaoId: updated.ibaoId,
    targetLevel: updated.targetLevel,
    targetLockRank: updated.targetLockRank,
    groups: groupList.map(({ id, name }) => ({ id, name })),
    activeGroup,
  });
}
