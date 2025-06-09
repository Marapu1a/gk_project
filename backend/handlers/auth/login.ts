import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { signJwt } from '../../utils/jwt';
import bcrypt from 'bcrypt';
import { loginSchema } from '../../schemas/auth';

export async function loginHandler(req: FastifyRequest, reply: FastifyReply) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Некорректные данные', details: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;
  const INVALID_MSG = { error: 'Неверный email или пароль' };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return reply.code(401).send(INVALID_MSG);

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return reply.code(401).send(INVALID_MSG);

  const token = signJwt({ userId: user.id, role: user.role });
  const redirectTo = user.role === 'ADMIN' ? '/admin' : '/dashboard';

  return reply.send({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
    redirectTo,
  });
}
