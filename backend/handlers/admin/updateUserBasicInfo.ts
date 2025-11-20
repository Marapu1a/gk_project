// src/handlers/admin/updateUserBasicInfo.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { z } from 'zod';

const updateUserSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  fullNameLatin: z.string().min(1).max(100).optional(), // ← добавили
  phone: z.string().max(30).nullable().optional(),
  birthDate: z.string().datetime().nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
});

export async function updateUserBasicInfoHandler(req: FastifyRequest, reply: FastifyReply) {
  const { id } = req.params as { id: string };

  if (req.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Невалидные данные', details: parsed.error.flatten() });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: parsed.data,
    select: {
      id: true,
      fullName: true,
      fullNameLatin: true, // ← возвращаем
      phone: true,
      birthDate: true,
      country: true,
      city: true,
    },
  });

  return reply.send(updated);
}
