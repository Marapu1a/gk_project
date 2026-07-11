import { ExternalSupervisorClaimStatus, NotificationType } from '@prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma';
import { createNotification } from '../../utils/notifications';

type ListQuery = {
  mode?: 'active' | 'history';
  page?: string;
  perPage?: string;
  nameSort?: 'asc' | 'desc';
};

// Active = claim still needs admin work (PENDING or APPROVED-but-not-setup)
const ACTIVE_STATUSES = new Set<ExternalSupervisorClaimStatus>([
  ExternalSupervisorClaimStatus.PENDING,
  ExternalSupervisorClaimStatus.APPROVED,
]);

const HISTORY_STATUSES = new Set<ExternalSupervisorClaimStatus>([
  ExternalSupervisorClaimStatus.SETUP_COMPLETE,
  ExternalSupervisorClaimStatus.REJECTED,
]);

export async function getExternalSupervisorClaimsHandler(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const query = req.query as ListQuery;
  const mode = query.mode === 'history' ? 'history' : 'active';
  const page = Math.max(1, Number(query.page) || 1);
  const perPage = Math.min(100, Math.max(20, Number(query.perPage) || 20));
  const nameSort = query.nameSort === 'asc' || query.nameSort === 'desc' ? query.nameSort : null;

  const statusFilter = mode === 'active'
    ? { in: [ExternalSupervisorClaimStatus.PENDING, ExternalSupervisorClaimStatus.APPROVED] }
    : { in: [ExternalSupervisorClaimStatus.SETUP_COMPLETE, ExternalSupervisorClaimStatus.REJECTED] };

  const where = { externalSupervisorClaimStatus: statusFilter };

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: nameSort
        ? [{ fullName: nameSort }, mode === 'active'
          ? { externalSupervisorClaimedAt: 'asc' }
          : { externalSupervisorClaimReviewedAt: 'desc' }]
        : mode === 'active'
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
        externalSupervisorClaimAssignedTo: true,
        externalSupervisorClaimReviewedAt: true,
        externalSupervisorClaimReviewedBy: true,
      },
    }),
  ]);

  // Resolve assigned admin names in one batch query
  const assignedIds = [...new Set(
    users.map(u => u.externalSupervisorClaimAssignedTo).filter(Boolean) as string[]
  )];
  const assignedAdmins = assignedIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: assignedIds } },
        select: { id: true, fullName: true, email: true },
      })
    : [];
  const adminById = new Map(assignedAdmins.map(a => [a.id, a]));

  const enriched = users.map(u => ({
    ...u,
    assignedAdmin: u.externalSupervisorClaimAssignedTo
      ? (adminById.get(u.externalSupervisorClaimAssignedTo) ?? null)
      : null,
  }));

  return reply.send({ total, page, perPage, users: enriched });
}

export async function assignExternalSupervisorClaimHandler(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = req.params as { id: string };
  const { action } = (req.body ?? {}) as { action?: 'assign' | 'unassign' };

  if (action !== 'assign' && action !== 'unassign') {
    return reply.code(400).send({ error: 'action должен быть assign или unassign' });
  }

  const current = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      externalSupervisorClaimStatus: true,
      externalSupervisorClaimAssignedTo: true,
    },
  });

  if (!current) return reply.code(404).send({ error: 'Пользователь не найден' });

  if (!ACTIVE_STATUSES.has(current.externalSupervisorClaimStatus)) {
    return reply.code(409).send({ error: 'Обращение уже завершено' });
  }

  if (action === 'assign') {
    // Already assigned to this admin — idempotent
    if (current.externalSupervisorClaimAssignedTo === req.user.userId) {
      return reply.send({ assigned: true });
    }
    // Assigned to another admin — block
    if (current.externalSupervisorClaimAssignedTo) {
      return reply.code(409).send({ error: 'Обращение уже взято в работу другим администратором' });
    }

    await prisma.user.update({
      where: { id: current.id },
      data: { externalSupervisorClaimAssignedTo: req.user.userId },
    });

    return reply.send({ assigned: true });
  }

  // unassign — only the assigned admin can release
  if (current.externalSupervisorClaimAssignedTo !== req.user.userId) {
    return reply.code(403).send({ error: 'Только назначенный администратор может освободить обращение' });
  }

  await prisma.user.update({
    where: { id: current.id },
    data: { externalSupervisorClaimAssignedTo: null },
  });

  return reply.send({ assigned: false });
}

export async function updateExternalSupervisorClaimHandler(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = req.params as { id: string };
  const { status } = (req.body ?? {}) as { status?: ExternalSupervisorClaimStatus };

  const allowed = new Set<ExternalSupervisorClaimStatus>([
    ExternalSupervisorClaimStatus.APPROVED,
    ExternalSupervisorClaimStatus.REJECTED,
    ExternalSupervisorClaimStatus.SETUP_COMPLETE,
  ]);

  if (!status || !allowed.has(status)) {
    return reply.code(400).send({ error: 'Некорректный статус' });
  }

  const admin = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { email: true },
  });
  if (!admin) return reply.code(401).send({ error: 'Администратор не найден' });

  const current = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      externalSupervisorClaimStatus: true,
      externalSupervisorClaimAssignedTo: true,
    },
  });
  if (!current) return reply.code(404).send({ error: 'Пользователь не найден' });

  // Only the assigned admin may act
  if (current.externalSupervisorClaimAssignedTo !== req.user.userId) {
    return reply.code(403).send({ error: 'Сначала возьмите обращение в работу' });
  }

  // Validate transitions
  if (
    status === ExternalSupervisorClaimStatus.APPROVED &&
    current.externalSupervisorClaimStatus !== ExternalSupervisorClaimStatus.PENDING
  ) {
    return reply.code(409).send({ error: 'Некорректный переход статуса' });
  }

  if (
    status === ExternalSupervisorClaimStatus.SETUP_COMPLETE &&
    current.externalSupervisorClaimStatus !== ExternalSupervisorClaimStatus.APPROVED
  ) {
    return reply.code(409).send({ error: 'Настройку можно завершить только после подтверждения квалификации' });
  }

  if (
    status === ExternalSupervisorClaimStatus.REJECTED &&
    HISTORY_STATUSES.has(current.externalSupervisorClaimStatus)
  ) {
    return reply.code(409).send({ error: 'Обращение уже завершено' });
  }

  const actionLabel =
    status === ExternalSupervisorClaimStatus.APPROVED
      ? 'Подтвердил внешнюю квалификацию супервизора'
      : status === ExternalSupervisorClaimStatus.SETUP_COMPLETE
        ? 'Завершил настройку профиля внешнего супервизора'
        : 'Не подтвердил внешнюю квалификацию супервизора';

  const notificationMessage =
    status === ExternalSupervisorClaimStatus.APPROVED
      ? 'Ваша квалификация супервизора IBAO (BCBA) подтверждена. Администратор настроит ваш профиль в ближайшее время.'
      : status === ExternalSupervisorClaimStatus.SETUP_COMPLETE
        ? 'Ваш профиль настроен. Вы можете войти в систему и начать работу.'
        : 'Ваш запрос на подтверждение квалификации IBAO (BCBA) не был подтверждён. Вы можете самостоятельно выбрать путь сертификации.';

  // On SETUP_COMPLETE and REJECTED — clear the assignment (claim is done)
  const clearAssignment =
    status === ExternalSupervisorClaimStatus.SETUP_COMPLETE ||
    status === ExternalSupervisorClaimStatus.REJECTED;

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: current.id },
      data: {
        externalSupervisorClaimStatus: status,
        externalSupervisorClaimReviewedAt: new Date(),
        externalSupervisorClaimReviewedBy: admin.email,
        ...(clearAssignment ? { externalSupervisorClaimAssignedTo: null } : {}),
      },
      select: {
        id: true,
        externalSupervisorClaimStatus: true,
        externalSupervisorClaimAssignedTo: true,
        externalSupervisorClaimReviewedAt: true,
        externalSupervisorClaimReviewedBy: true,
      },
    });

    await tx.adminUserActionLog.create({
      data: { userId: current.id, adminId: req.user.userId, action: actionLabel },
    });

    return updated;
  });

  await createNotification({
    userId: current.id,
    type: NotificationType.USER,
    message: notificationMessage,
  });

  return reply.send(user);
}
