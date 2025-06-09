import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6),
});

export async function resetPasswordHandler(req: FastifyRequest, reply: FastifyReply) {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
  }

  const { token, password } = parsed.data;
  const secret = process.env.RESET_PASSWORD_SECRET;

  if (!secret) {
    return reply.code(500).send({ error: 'Секрет сброса не задан' });
  }

  try {
    const decoded = jwt.verify(token, secret) as { userId: string };

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: decoded.userId },
      data: { password: hashedPassword },
    });

    return reply.send({ success: true });
  } catch (err) {
    console.error('[RESET ERROR]', err);
    return reply.code(401).send({ error: 'Недействительный или просроченный токен' });
  }
}
