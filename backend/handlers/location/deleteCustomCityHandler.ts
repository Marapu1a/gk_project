import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';

type DeleteBody = {
  id: string;
};

export async function deleteCustomCityHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = (req as any).user;

  if (!user || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Недостаточно прав' });
  }

  const { id } = req.body as DeleteBody;

  if (!id) {
    return reply.code(400).send({ error: 'Не указан id города' });
  }

  const exists = await prisma.customCity.findUnique({ where: { id } });

  if (!exists) {
    return reply.code(404).send({ error: 'Город не найден' });
  }

  await prisma.customCity.delete({ where: { id } });

  return reply.send({ ok: true });
}
