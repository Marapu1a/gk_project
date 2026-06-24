import {
  CEUCategory,
  CycleStatus,
  CycleType,
  PaymentStatus,
  PaymentType,
  PracticeLevel,
  RecordStatus,
  TargetLevel,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';
import {
  ceuRequirementsByGroup,
  renewalCeuRequirementsByGroup,
  type CEUSummary,
} from '../../utils/ceuRequirements';
import {
  renewalSupervisionRequirementsByGroup,
  supervisionRequirementsByGroup,
  type SupervisionRequirement,
} from '../../utils/supervisionRequirements';
import { getCycleSupervisionTotals } from '../../utils/getCycleSupervisionTotals';
import { getCycleMentorshipTotal } from '../../utils/getCycleMentorshipTotal';
import { resolveDocumentReviewRequestStatus } from '../documentReviewAdmin/documentReviewFileStatusUtils';
import { ensureRenewalDocumentInheritance } from '../documentReview/ensureRenewalDocumentInheritance';

const RU_BY_LEVEL: Record<TargetLevel, 'Инструктор' | 'Куратор' | 'Супервизор'> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

const PAYMENT_LABELS: Record<PaymentType, string> = {
  FULL_PACKAGE: 'Полный пакет',
  REGISTRATION: 'Подача заявки на сертификацию',
  DOCUMENT_REVIEW: 'Экспертиза документов',
  EXAM_ACCESS: 'Экзамен',
  RENEWAL: 'Ресертификация',
};

type PaymentCheck = {
  type: PaymentType;
  label: string;
  paid: boolean;
  requestedAt: Date | null;
  confirmedAt: Date | null;
};

type ReadyBlock<TCurrent, TRequired> = {
  ready: boolean;
  current: TCurrent;
  required: TRequired | null;
};

function emptyCeu(): CEUSummary {
  return { ethics: 0, cultDiver: 0, supervision: 0, general: 0, total: 0 };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function aggregateCeu(entries: Array<{ category: CEUCategory; value: number }>): CEUSummary {
  const summary = emptyCeu();

  for (const entry of entries) {
    if (entry.category === CEUCategory.ETHICS) summary.ethics += entry.value;
    if (entry.category === CEUCategory.CULTURAL_DIVERSITY) summary.cultDiver += entry.value;
    if (entry.category === CEUCategory.SUPERVISION) summary.supervision += entry.value;
    if (entry.category === CEUCategory.GENERAL) summary.general += entry.value;
  }

  summary.total =
    summary.ethics + summary.cultDiver + summary.supervision + summary.general;

  return summary;
}

function isCeuReady(current: CEUSummary, required: CEUSummary | null) {
  if (!required) return false;

  return (
    current.ethics >= required.ethics &&
    current.cultDiver >= required.cultDiver &&
    current.supervision >= required.supervision &&
    current.general >= required.general &&
    current.total >= required.total
  );
}

function isSupervisionReady(
  current: { practice: number; supervision: number; mentor: number },
  required: SupervisionRequirement | null,
) {
  if (!required) return false;

  return (
    current.practice >= required.practice &&
    current.supervision >= required.supervision &&
    current.mentor >= required.supervisor
  );
}

function requiredPaymentTypes(
  targetLevel: TargetLevel | null | undefined,
  isRenewal: boolean,
) {
  if (isRenewal) {
    return [PaymentType.RENEWAL];
  }

  if (targetLevel === TargetLevel.SUPERVISOR) {
    return [PaymentType.DOCUMENT_REVIEW, PaymentType.EXAM_ACCESS];
  }

  return [PaymentType.REGISTRATION, PaymentType.DOCUMENT_REVIEW, PaymentType.EXAM_ACCESS];
}

export async function buildExamReadiness(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      groups: {
        select: { group: { select: { id: true, name: true, rank: true } } },
      },
    },
  });

  if (!user) return null;

  const activeCycle = await prisma.certificationCycle.findFirst({
    where: { userId, status: CycleStatus.ACTIVE },
    orderBy: { startedAt: 'desc' },
    select: { id: true, type: true, status: true, targetLevel: true, startedAt: true },
  });

  const groups = user.groups.map((item) => item.group).sort((a, b) => b.rank - a.rank);
  const currentGroup = groups[0] ?? null;
  const missing: string[] = [];

  if (!activeCycle) {
    return {
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, currentGroup, groups },
      activeCycle: null,
      ceu: { ready: false, current: emptyCeu(), required: null } satisfies ReadyBlock<CEUSummary, CEUSummary>,
      supervision: {
        ready: false,
        current: { practice: 0, supervision: 0, mentor: 0 },
        required: null,
      },
      documents: { ready: false, request: null },
      payments: { ready: false, items: [] as PaymentCheck[] },
      ready: false,
      missing: ['Нет активного цикла сертификации'],
    };
  }

  const targetGroupName = RU_BY_LEVEL[activeCycle.targetLevel];
  const isRenewal = activeCycle.type === CycleType.RENEWAL;
  const isExperiencedSupervisor = currentGroup?.name === 'Опытный Супервизор';

  const ceuRequired =
    (isRenewal
      ? renewalCeuRequirementsByGroup[targetGroupName]
      : ceuRequirementsByGroup[targetGroupName]) ?? null;

  const supervisionRequired =
    isExperiencedSupervisor
      ? { practice: 0, supervision: 0, supervisor: 0 }
      : ((isRenewal
          ? renewalSupervisionRequirementsByGroup[targetGroupName]
          : supervisionRequirementsByGroup[targetGroupName]) ?? null);

  await prisma.$transaction((tx) =>
    ensureRenewalDocumentInheritance(tx, userId, {
      id: activeCycle.id,
      type: activeCycle.type,
    }),
  );

  const [
    ceuEntries,
    payments,
    documentRequests,
    platformCertificate,
  ] = await Promise.all([
    prisma.cEUEntry.findMany({
      where: { status: RecordStatus.CONFIRMED, record: { cycleId: activeCycle.id } },
      select: { category: true, value: true },
    }),
    prisma.payment.findMany({
      where: {
        userId,
        type: {
          in: [
            PaymentType.FULL_PACKAGE,
            PaymentType.REGISTRATION,
            PaymentType.DOCUMENT_REVIEW,
            PaymentType.EXAM_ACCESS,
            PaymentType.RENEWAL,
          ],
        },
        OR: [{ targetLevel: activeCycle.targetLevel }, { targetLevel: null }],
      },
      orderBy: { confirmedAt: 'desc' },
      select: {
        id: true,
        type: true,
        targetLevel: true,
        status: true,
        requestedAt: true,
        confirmedAt: true,
        comment: true,
      },
    }),
    prisma.documentReviewRequest.findMany({
      where: {
        userId,
        OR: [{ cycleId: activeCycle.id }, { cycleId: null }],
      },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        cycleId: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        comment: true,
        documentFiles: {
          select: {
            id: true,
            type: true,
            status: true,
            file: { select: { id: true, fileId: true, name: true, mimeType: true } },
          },
        },
      },
      take: 10,
    }),
    prisma.certificate.findFirst({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
      select: { id: true },
    }),
  ]);

  const documentRequest =
    documentRequests.find((request) => request.cycleId === activeCycle.id) ?? null;
  const documentRequestStatus = documentRequest
    ? resolveDocumentReviewRequestStatus(documentRequest)
    : null;

  const ceuCurrent = aggregateCeu(ceuEntries);
  const ceuReady = isCeuReady(ceuCurrent, ceuRequired);
  if (!ceuReady) missing.push('Недостаточно CEU-баллов');

  let bonusPractice = 0;
  if (!isRenewal && activeCycle.targetLevel === TargetLevel.SUPERVISOR) {
    const lastCompletedCurator = await prisma.certificationCycle.findFirst({
      where: {
        userId,
        status: CycleStatus.COMPLETED,
        targetLevel: TargetLevel.CURATOR,
      },
      orderBy: { endedAt: 'desc' },
      select: { id: true },
    });

    if (lastCompletedCurator) {
      const bonusAgg = await prisma.supervisionHour.aggregate({
        where: {
          status: RecordStatus.CONFIRMED,
          type: { in: [PracticeLevel.PRACTICE, PracticeLevel.IMPLEMENTING, PracticeLevel.PROGRAMMING] },
          record: { cycleId: lastCompletedCurator.id },
        },
        _sum: { value: true },
      });

      bonusPractice = bonusAgg._sum.value ?? 0;
    }
  }

  const supervisionTotals = await getCycleSupervisionTotals(
    activeCycle.id,
    activeCycle.targetLevel,
    bonusPractice,
  );

  const mentorTotals = await getCycleMentorshipTotal(activeCycle.id);

  const supervisionCurrent = {
    practice: round2(supervisionTotals.practiceConfirmed),
    supervision: round2(supervisionTotals.supervisionConfirmed),
    mentor: round2(mentorTotals.confirmed),
  };
  const supervisionReady = isSupervisionReady(supervisionCurrent, supervisionRequired);
  if (!supervisionReady) {
    missing.push(
      supervisionRequired?.supervisor
        ? 'Недостаточно часов менторства'
        : 'Недостаточно часов супервизии',
    );
  }

  const documentsReady =
    documentRequestStatus === RecordStatus.CONFIRMED ||
    (isRenewal && Boolean(platformCertificate));
  if (!documentsReady) missing.push('Документы не подтверждены');

  const fullPackage = payments.find(
    (payment) => payment.type === PaymentType.FULL_PACKAGE && payment.status === PaymentStatus.PAID,
  );
  const paymentItems: PaymentCheck[] = requiredPaymentTypes(
    activeCycle.targetLevel,
    isRenewal,
  ).map((type) => {
    const directPaid = payments.find(
      (payment) => payment.type === type && payment.status === PaymentStatus.PAID,
    );
    const directLatest = payments.find((payment) => payment.type === type) ?? null;
    const packagePayment = isRenewal ? null : fullPackage;
    const paidPayment = packagePayment ?? directPaid ?? null;
    const requestedPayment = packagePayment ?? directLatest ?? null;

    return {
      type,
      label: PAYMENT_LABELS[type],
      paid: Boolean(paidPayment),
      requestedAt: requestedPayment?.requestedAt ?? null,
      confirmedAt: paidPayment?.confirmedAt ?? null,
    };
  });
  const paymentsReady = paymentItems.every((item) => item.paid);
  if (!paymentsReady) missing.push('Не все платежи оплачены');

  return {
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, currentGroup, groups },
    activeCycle,
    ceu: { ready: ceuReady, current: ceuCurrent, required: ceuRequired },
    supervision: { ready: supervisionReady, current: supervisionCurrent, required: supervisionRequired },
    documents: {
      ready: documentsReady,
      request: documentRequest
        ? {
            ...documentRequest,
            status: documentRequestStatus,
            adminUrl: `/admin/document-review/${documentRequest.id}`,
          }
        : null,
    },
    payments: { ready: paymentsReady, items: paymentItems },
    ready: ceuReady && supervisionReady && documentsReady && paymentsReady,
    missing,
  };
}
