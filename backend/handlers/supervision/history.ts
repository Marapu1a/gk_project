// src/handlers/supervision/history.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { RecordStatus, CycleStatus } from '@prisma/client';
import { getCycleMentorshipTotal } from '../../utils/getCycleMentorshipTotal';

type Query = {
  status?: RecordStatus; // UNCONFIRMED | CONFIRMED | REJECTED | SPENT
  take?: string;         // размер страницы (1..100), по умолчанию 25
  cursor?: string;       // пагинация по hour.id
};

function normalizeLevel(type: string): string {
  if (type === 'INSTRUCTOR') return 'PRACTICE';
  if (type === 'CURATOR') return 'SUPERVISION';
  return type;
}

export async function supervisionHistoryHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) return reply.code(401).send({ error: 'Не авторизован' });

  const { status, take = '25', cursor } = req.query as Query;

  if (status && !['UNCONFIRMED', 'CONFIRMED', 'REJECTED', 'SPENT'].includes(status)) {
    return reply.code(400).send({ error: 'Недопустимый статус' });
  }

  const limitNum = Number(take);
  const limit = Math.max(1, Math.min(100, Number.isFinite(limitNum) ? limitNum : 25));

  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId, status: CycleStatus.ACTIVE },
    select: { id: true },
  });

  if (!activeCycle) {
    return reply.send({ items: [], nextCursor: null });
  }

  const where = {
    record: { userId, cycleId: activeCycle.id },
    ...(status ? { status } : {}),
  };

  const [hours, mentorshipTotals] = await Promise.all([
    prisma.supervisionHour.findMany({
      where,
      select: {
        id: true,
        type: true,
        value: true,
        status: true,
        reviewedAt: true,
        rejectedReason: true,
        reviewer: { select: { id: true, fullName: true, email: true } },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
        record: { select: { id: true, createdAt: true, fileId: true } },
      },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'desc' }, // ✅ стабильная пагинация
    }),
    getCycleMentorshipTotal(activeCycle.id),
  ]);

  const nextCursor = hours.length === limit ? hours[hours.length - 1].id : null;
  const items = hours.map((h) => ({
    id: h.id,
    recordId: h.record.id,
    fileId: h.record.fileId,
    type: normalizeLevel(h.type),
    value: h.value,
    status: h.status,
    createdAt: h.record.createdAt,
    reviewedAt: h.reviewedAt,
    rejectedReason: h.rejectedReason,
    reviewer: h.reviewer
      ? { id: h.reviewer.id, fullName: h.reviewer.fullName, email: h.reviewer.email }
      : null,
    reviewedBy: h.reviewedBy
      ? { id: h.reviewedBy.id, fullName: h.reviewedBy.fullName, email: h.reviewedBy.email }
      : null,
  }));

  const mentorCorrection = mentorshipTotals.adminCorrection;
  if (!cursor && (!status || status === RecordStatus.CONFIRMED) && mentorCorrection) {
    items.push({
      id: `admin-mentorship-${mentorCorrection.id}`,
      recordId: mentorCorrection.id,
      fileId: null,
      type: 'SUPERVISOR',
      value: mentorCorrection.mentor,
      status: RecordStatus.CONFIRMED,
      createdAt: mentorCorrection.updatedAt,
      reviewedAt: mentorCorrection.updatedAt,
      rejectedReason: null,
      reviewer: null,
      reviewedBy: mentorCorrection.admin
        ? {
            id: mentorCorrection.admin.id,
            fullName: mentorCorrection.admin.fullName,
            email: mentorCorrection.admin.email,
          }
        : null,
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return reply.send({
    items,
    nextCursor,
  });
}
