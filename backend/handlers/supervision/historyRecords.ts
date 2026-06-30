import { FastifyRequest, FastifyReply } from 'fastify';
import { CycleStatus, PracticeLevel, RecordStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { getCycleMentorshipTotal } from '../../utils/getCycleMentorshipTotal';
import { getCyclePracticeCorrection } from '../../utils/getCyclePracticeCorrection';

type Query = {
  take?: string;
  cursor?: string;
};

type StatusSummary = {
  status: RecordStatus | 'MIXED';
  reviewedAt: Date | null;
  rejectedReason: string | null;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function summarizeStatus(hours: Array<{ status: RecordStatus; reviewedAt: Date | null; rejectedReason: string | null }>): StatusSummary {
  if (hours.length === 0) {
    return { status: 'UNCONFIRMED', reviewedAt: null, rejectedReason: null };
  }

  const statuses = new Set(hours.map((hour) => hour.status));
  const status = statuses.size === 1 ? hours[0].status : 'MIXED';
  const reviewedAt =
    hours
      .map((hour) => hour.reviewedAt)
      .filter((value): value is Date => value !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const rejectedReason = hours.find((hour) => hour.rejectedReason)?.rejectedReason ?? null;

  return { status, reviewedAt, rejectedReason };
}

function aggregateHours(hours: Array<{ type: PracticeLevel; value: number }>) {
  let implementing = 0;
  let programming = 0;
  let legacyPractice = 0;
  let mentor = 0;

  for (const hour of hours) {
    if (hour.type === PracticeLevel.IMPLEMENTING) implementing += hour.value;
    if (hour.type === PracticeLevel.PROGRAMMING) programming += hour.value;
    if (hour.type === PracticeLevel.PRACTICE || hour.type === PracticeLevel.INSTRUCTOR) {
      legacyPractice += hour.value;
    }
    if (hour.type === PracticeLevel.SUPERVISOR) mentor += hour.value;
  }

  return {
    implementing: round2(implementing + legacyPractice),
    programming: round2(programming),
    mentor: round2(mentor),
  };
}

export async function supervisionHistoryRecordsHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId;
  if (!userId) return reply.code(401).send({ error: 'Не авторизован' });

  const { take = '25', cursor } = req.query as Query;
  const limitNum = Number(take);
  const limit = Math.max(1, Math.min(100, Number.isFinite(limitNum) ? limitNum : 25));

  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId, status: CycleStatus.ACTIVE },
    select: { id: true },
  });

  if (!activeCycle) {
    return reply.send({ records: [], nextCursor: null });
  }

  const [records, user, mentorshipTotals, practiceCorrectionTotals] = await Promise.all([
    prisma.supervisionRecord.findMany({
      where: {
        userId,
        cycleId: activeCycle.id,
      },
      select: {
        id: true,
        fileId: true,
        createdAt: true,
        supervisionDate: true,
        periodStartedAt: true,
        periodEndedAt: true,
        treatmentSetting: true,
        description: true,
        ethicsAcceptedAt: true,
        draftDirectIndividual: true,
        draftDirectGroup: true,
        draftNonObservingIndividual: true,
        draftNonObservingGroup: true,
        user: { select: { id: true, fullName: true, email: true } },
        hours: {
          select: {
            id: true,
            type: true,
            value: true,
            status: true,
            reviewedAt: true,
            rejectedReason: true,
            reviewer: { select: { id: true, fullName: true, email: true } },
            reviewedBy: { select: { id: true, fullName: true, email: true } },
          },
          orderBy: { id: 'asc' },
        },
      },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'desc' },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true },
    }),
    getCycleMentorshipTotal(activeCycle.id),
    getCyclePracticeCorrection(activeCycle.id),
  ]);

  const nextCursor = records.length === limit ? records[records.length - 1].id : null;
  const mappedRecords = records.map((record) => {
    const hours = record.hours;
    const hourTotals = aggregateHours(hours);
    const statusSummary = summarizeStatus(hours);
    const supervisor = hours.find((hour) => hour.reviewer)?.reviewer ?? null;
    const reviewedBy = hours.find((hour) => hour.reviewedBy)?.reviewedBy ?? null;
    const directIndividual = record.draftDirectIndividual ?? 0;
    const directGroup = record.draftDirectGroup ?? 0;
    const nonObservingIndividual = record.draftNonObservingIndividual ?? 0;
    const nonObservingGroup = record.draftNonObservingGroup ?? 0;

    return {
      id: record.id,
      fileId: record.fileId,
      createdAt: record.createdAt,
      supervisionDate: record.supervisionDate,
      periodStartedAt: record.periodStartedAt,
      periodEndedAt: record.periodEndedAt,
      treatmentSetting: record.treatmentSetting,
      description: record.description,
      ethicsAcceptedAt: record.ethicsAcceptedAt,
      hours: hourTotals,
      distribution: {
        directIndividual,
        directGroup,
        nonObservingIndividual,
        nonObservingGroup,
        direct: round2(directIndividual + directGroup),
        nonObserving: round2(nonObservingIndividual + nonObservingGroup),
      },
      status: statusSummary.status,
      reviewedAt: statusSummary.reviewedAt,
      rejectedReason: statusSummary.rejectedReason,
      user: record.user,
      supervisor,
      reviewedBy,
      isAdminCorrection: false,
      correction: null as null | { kind: 'PRACTICE' | 'MENTORSHIP'; before: number; after: number },
    };
  });

  const mentorCorrection = mentorshipTotals.adminCorrection;
  if (!cursor && mentorCorrection && user) {
    mappedRecords.push({
      id: `admin-mentorship-${mentorCorrection.id}`,
      fileId: null,
      createdAt: mentorCorrection.updatedAt,
      supervisionDate: mentorCorrection.updatedAt,
      periodStartedAt: mentorCorrection.updatedAt,
      periodEndedAt: null,
      treatmentSetting: 'Служебная корректировка',
      description: 'Корректировка часов менторства администратором',
      ethicsAcceptedAt: null,
      hours: {
        implementing: 0,
        programming: 0,
        mentor: round2(mentorCorrection.mentor),
      },
      distribution: {
        directIndividual: 0,
        directGroup: 0,
        nonObservingIndividual: 0,
        nonObservingGroup: 0,
        direct: 0,
        nonObserving: 0,
      },
      status: RecordStatus.CONFIRMED,
      reviewedAt: mentorCorrection.updatedAt,
      rejectedReason: null,
      user,
      supervisor: null,
      reviewedBy: mentorCorrection.admin,
      isAdminCorrection: true,
      correction: {
        kind: 'MENTORSHIP',
        before: round2(mentorshipTotals.rawConfirmed),
        after: round2(mentorCorrection.mentor),
      },
    });
  }

  const practiceCorrection = practiceCorrectionTotals.adminCorrection;
  if (!cursor && practiceCorrection && user) {
    const directIndividual = round2(practiceCorrection.directIndividual);
    const directGroup = round2(practiceCorrection.directGroup);
    const nonObservingIndividual = round2(practiceCorrection.nonObservingIndividual);
    const nonObservingGroup = round2(practiceCorrection.nonObservingGroup);

    mappedRecords.push({
      id: `admin-practice-${practiceCorrection.id}`,
      fileId: null,
      createdAt: practiceCorrection.updatedAt,
      supervisionDate: practiceCorrection.updatedAt,
      periodStartedAt: practiceCorrection.updatedAt,
      periodEndedAt: null,
      treatmentSetting: 'Служебная корректировка',
      description: 'Корректировка часов практики и супервизии администратором',
      ethicsAcceptedAt: null,
      hours: {
        implementing: round2(practiceCorrection.implementing),
        programming: round2(practiceCorrection.programming),
        mentor: 0,
      },
      distribution: {
        directIndividual,
        directGroup,
        nonObservingIndividual,
        nonObservingGroup,
        direct: round2(directIndividual + directGroup),
        nonObserving: round2(nonObservingIndividual + nonObservingGroup),
      },
      status: RecordStatus.CONFIRMED,
      reviewedAt: practiceCorrection.updatedAt,
      rejectedReason: null,
      user,
      supervisor: null,
      reviewedBy: practiceCorrection.admin,
      isAdminCorrection: true,
      correction: {
        kind: 'PRACTICE',
        before: round2(practiceCorrectionTotals.rawPractice),
        after: round2(practiceCorrectionTotals.correctedPractice),
      },
    });
  }

  mappedRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return reply.send({
    records: mappedRecords,
    nextCursor,
  });
}
