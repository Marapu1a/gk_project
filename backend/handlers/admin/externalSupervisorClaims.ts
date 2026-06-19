import { ExternalSupervisorClaimStatus } from '@prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';

type ListQuery = {
  mode?: 'active' | 'history';
  page?: string;
  perPage?: string;
};

const REVIEW_STATUSES = new Set<ExternalSupervisorClaimStatus>([
  ExternalSupervisorClaimStatus.APPROVED,
  ExternalSupervisorClaimStatus.REJECTED,
]);

export async function getExternalSupervisorClaimsHandler(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  if (req.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  const query = req.query as ListQuery;
  const mode = query.mode === 'history' ? 'history' : 'active';
  const page = Math.max(1, Number(query.page) || 1);
  const perPage = Math.min(100, Math.max(20, Number(query.perPage) || 20));
  const status = mode === 'active'
    ? ExternalSupervisorClaimStatus.PENDING
    : { in: [ExternalSupervisorClaimStatus.APPROVED, ExternalSupervisorClaimStatus.REJECTED] };

  const where = { externalSupervisorClaimStatus: status };
  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: mode === 'active'
        ? { externalSupervisorClaimedAt: 'asc' }
        : { externalSupervisorClaimReviewedAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        externalSupervisorClaimStatus: true,
        externalSupervisorClaimedAt: true,
        externalSupervisorClaimReviewedAt: true,
        externalSupervisorClaimReviewedBy: true,
      },
    }),
  ]);

  return reply.send({ total, page, perPage, users });
}

export async function updateExternalSupervisorClaimHandler(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  if (req.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Доступ запрещён' });
  }

  const { id } = req.params as { id: string };
  const { status } = (req.body ?? {}) as { status?: ExternalSupervisorClaimStatus };
  if (!status || !REVIEW_STATUSES.has(status)) {
    return reply.code(400).send({ error: 'Некорректный результат проверки' });
  }

  const admin = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { email: true },
  });
  if (!admin) return reply.code(401).send({ error: 'Администратор не найден' });

  const current = await prisma.user.findUnique({
    where: { id },
    select: { id: true, externalSupervisorClaimStatus: true },
  });
  if (!current) return reply.code(404).send({ error: 'Пользователь не найден' });
  if (current.externalSupervisorClaimStatus !== ExternalSupervisorClaimStatus.PENDING) {
    return reply.code(409).send({ error: 'Обращение уже обработано' });
  }

  const action = status === ExternalSupervisorClaimStatus.APPROVED
    ? 'Подтвердил внешнюю квалификацию супервизора'
    : 'Не подтвердил внешнюю квалификацию супервизора';

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: current.id },
      data: {
        externalSupervisorClaimStatus: status,
        externalSupervisorClaimReviewedAt: new Date(),
        externalSupervisorClaimReviewedBy: admin.email,
      },
      select: {
        id: true,
        externalSupervisorClaimStatus: true,
        externalSupervisorClaimReviewedAt: true,
        externalSupervisorClaimReviewedBy: true,
      },
    });

    await tx.adminUserActionLog.create({
      data: {
        userId: current.id,
        adminId: req.user.userId,
        action,
      },
    });

    return updated;
  });

  return reply.send(user);
}
