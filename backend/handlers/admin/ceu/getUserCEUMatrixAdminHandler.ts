// src/handlers/admin/ceu/getUserCEUMatrixAdminHandler.ts
import { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { prisma } from '../../../lib/prisma';

type CEUCategory = 'ETHICS' | 'CULTURAL_DIVERSITY' | 'SUPERVISION' | 'GENERAL';
type CEUStatus = 'CONFIRMED' | 'SPENT' | 'REJECTED';

const CATEGORIES: readonly CEUCategory[] = ['ETHICS', 'CULTURAL_DIVERSITY', 'SUPERVISION', 'GENERAL'] as const;
const STATUSES: readonly CEUStatus[] = ['CONFIRMED', 'SPENT', 'REJECTED'] as const;

interface GetUserCEUMatrixRoute extends RouteGenericInterface {
  Params: { userId: string };
}

export async function getUserCEUMatrixAdminHandler(
  req: FastifyRequest<GetUserCEUMatrixRoute>,
  reply: FastifyReply
) {
  if (req.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Только администратор' });
  }

  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true },
  });
  if (!user) return reply.code(404).send({ error: 'Пользователь не найден' });

  // сгруппировать CEU по category+status
  const grouped = await prisma.cEUEntry.groupBy({
    by: ['category', 'status'],
    where: { record: { userId } },
    _sum: { value: true },
  });

  // инициализируем нулями
  const matrix: Record<CEUCategory, Record<CEUStatus, number>> = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = { CONFIRMED: 0, SPENT: 0, REJECTED: 0 };
    return acc;
  }, {} as Record<CEUCategory, Record<CEUStatus, number>>);

  for (const g of grouped) {
    const cat = g.category as CEUCategory;
    const st = g.status as CEUStatus;

    if ((CATEGORIES as readonly string[]).includes(cat) && (STATUSES as readonly string[]).includes(st)) {
      matrix[cat][st] = (g._sum.value ?? 0) as number;
    }
  }

  return reply.send({ user, matrix });
}
