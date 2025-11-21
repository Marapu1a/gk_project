// src/handlers/admin/updateUserPasswordAdminHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcrypt';

interface Route extends RouteGenericInterface {
  Params: { id: string };
  Body: { password: string };
}

const bodySchema = z.object({
  password: z.string().min(6, 'Минимум 6 символов'),
});

export async function updateUserPasswordAdminHandler(
  req: FastifyRequest<Route>,
  reply: FastifyReply
) {
  if (req.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Только администратор' });
  }

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные' });
  }

  const { id } = req.params;
  const { password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return reply.code(404).send({ error: 'Пользователь не найден' });
  }

  const hash = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id },
    data: {
      password: hash,
    },
  });

  return reply.send({ ok: true });
}
