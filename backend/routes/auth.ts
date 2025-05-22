import { FastifyInstance } from 'fastify';
import { getCourseRequest } from '../lib/getCourseClient';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET!;

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/email', async (req, reply) => {
    const { email } = req.body as { email?: string };

    if (!email) {
      return reply.status(400).send({ error: 'Email is required' });
    }

    const gc = await getCourseRequest('account.profile.get', { email });

    if (!gc.success || !gc.account) {
      return reply.status(401).send({ error: 'Пользователь не найден в ГК' });
    }

    const profile = gc.account;


    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          firstName: profile.first_name,
          lastName: profile.last_name,
          gcId: profile.id,
        },
      });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    return { token };
  });
}
