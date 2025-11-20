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

  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }
  const body = parsed.data;

  let birthDateISO: string | undefined;
  if (body.birthDate) {
    birthDateISO = /^\d{4}-\d{2}-\d{2}$/.test(body.birthDate)
      ? toISOFromDateOnly(body.birthDate)
      : new Date(body.birthDate).toISOString();
  }

  const data: Record<string, any> = {};
  if (body.fullName !== undefined) data.fullName = body.fullName.trim();
  if (body.fullNameLatin !== undefined) data.fullNameLatin = body.fullNameLatin.trim(); // ← добавили
  if (body.phone !== undefined) data.phone = body.phone.trim();
  if (birthDateISO !== undefined) data.birthDate = birthDateISO;
  if (body.country !== undefined) data.country = body.country.trim();
  if (body.city !== undefined) data.city = body.city.trim();
  if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl.trim();
  if (body.bio !== undefined) data.bio = body.bio.trim();

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
      fullNameLatin: true, // ← добавили
      phone: true,
      birthDate: true,
      country: true,
      city: true,
      avatarUrl: true,
      bio: true,
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
    fullNameLatin: updated.fullNameLatin, // ← добавили
    phone: updated.phone,
    birthDate: updated.birthDate,
    country: updated.country,
    city: updated.city,
    avatarUrl: updated.avatarUrl,
    bio: updated.bio,
    groups: groupList.map(({ id, name }) => ({ id, name })),
    activeGroup,
  });
}
