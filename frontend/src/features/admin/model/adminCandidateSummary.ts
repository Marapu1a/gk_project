import type { AdminUserDetails } from '../api/getUserDetails';
import { docReviewStatusLabels, examStatusLabels } from '@/utils/labels';
import { findPaymentForTarget } from '@/features/payment/model/paymentPolicy';

export type CandidateSummaryTone = 'good' | 'warn' | 'bad' | 'soft';

export type CandidateSummaryLine = {
  label: string;
  value: string | number;
  tone: CandidateSummaryTone;
  to?: string | null;
};

function formatNumber(value?: number | null) {
  if (value == null) return '0';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function capToRequired(current?: number | null, required?: number | null) {
  const currentValue = Number(current ?? 0);
  const requiredValue = Number(required ?? 0);

  if (requiredValue <= 0) return Math.max(0, currentValue);
  return Math.min(Math.max(0, currentValue), requiredValue);
}

function progressText(
  current?: number | null,
  required?: number | null,
  options?: { cap?: boolean },
) {
  const currentValue =
    options?.cap === false ? Math.max(0, Number(current ?? 0)) : capToRequired(current, required);
  return `${formatNumber(currentValue)} / ${formatNumber(required)}`;
}

function buildUrl(path: string, params: Record<string, string | number | null | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return;
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

function countPendingHours(
  user: AdminUserDetails,
  mode: 'supervision' | 'mentorship',
) {
  const activeCycleId = user.activeCycle?.id;

  return user.supervisionRecords.reduce((sum, record) => {
    if (activeCycleId && record.cycleId !== activeCycleId) return sum;

    const count = record.hours.filter((hour) => {
      if (hour.status !== 'UNCONFIRMED') return false;
      const isMentorship = hour.type === 'SUPERVISOR';
      return mode === 'mentorship' ? isMentorship : !isMentorship;
    }).length;

    return sum + count;
  }, 0);
}

function resolveDocumentStatus(user: AdminUserDetails) {
  const readiness = user.examReadiness?.documents;
  const latestRequest = readiness?.request ?? null;
  const hasArchivedRequests = user.documentReviewRequests.length > 0;

  if (readiness?.ready) {
    return {
      label: 'Принято',
      tone: 'good' as const,
      mode: 'history' as const,
    };
  }

  if (latestRequest) {
    const fallbackLabel =
      latestRequest.status === 'CONFIRMED'
        ? 'Принято'
        : latestRequest.status === 'REJECTED'
          ? 'Отклонено'
          : 'На проверке';

    return {
      label: docReviewStatusLabels[latestRequest.status] ?? fallbackLabel,
      tone: latestRequest.status === 'REJECTED' ? ('bad' as const) : ('warn' as const),
      mode:
        latestRequest.status === 'UNCONFIRMED' || latestRequest.status === 'PARTIALLY_CONFIRMED'
          ? ('active' as const)
          : ('history' as const),
    };
  }

  if (user.activeCycle && hasArchivedRequests) {
    return {
      label: 'Нет заявки активной сертификации',
      tone: 'bad' as const,
      mode: 'history' as const,
    };
  }

  return { label: 'Нет заявки', tone: 'bad' as const, mode: 'active' as const };
}

export function buildAdminCandidateSummary(
  user: AdminUserDetails,
  activeGroupName: string | null,
) {
  const activeCycle = user.activeCycle;
  const readiness = user.examReadiness;
  const summaryLines: CandidateSummaryLine[] = [];
  const reviewerLines: CandidateSummaryLine[] = [];
  const userSearch = user.email || user.fullName || '';

  if (activeCycle) {
    const documents = resolveDocumentStatus(user);
    const supervisionCurrent = readiness?.supervision.current;
    const supervisionRequired = readiness?.supervision.required;
    const ceuCurrent = readiness?.ceu.current;
    const ceuRequired = readiness?.ceu.required;
    const isRenewal = activeCycle.type === 'RENEWAL';
    const pendingSupervision = countPendingHours(user, 'supervision');
    const pendingMentorship = countPendingHours(user, 'mentorship');
    const supervisionUrl = buildUrl('/admin/supervision-candidates', {
      kind: 'supervision',
      search: userSearch,
    });
    const mentorshipUrl = buildUrl('/admin/supervision-candidates', {
      kind: 'mentorship',
      search: userSearch,
    });

    summaryLines.push({
      label: 'Документы',
      value: documents.label,
      tone: documents.tone,
      to: buildUrl('/admin/document-review', {
        search: userSearch,
        mode: documents.mode,
      }),
    });

    if ((supervisionRequired?.practice ?? 0) > 0) {
      summaryLines.push({
        label: 'Часы практики',
        value: progressText(supervisionCurrent?.practice, supervisionRequired?.practice),
        tone:
          (supervisionCurrent?.practice ?? 0) >= supervisionRequired!.practice ? 'good' : 'bad',
        to: supervisionUrl,
      });
    }

    if ((supervisionRequired?.supervision ?? 0) > 0) {
      summaryLines.push({
        label: 'Часы супервизии',
        value: progressText(supervisionCurrent?.supervision, supervisionRequired?.supervision),
        tone:
          (supervisionCurrent?.supervision ?? 0) >= supervisionRequired!.supervision
            ? 'good'
            : 'bad',
        to: supervisionUrl,
      });
      summaryLines.push({
        label: 'Заявки часов на проверке',
        value: pendingSupervision,
        tone: pendingSupervision > 0 ? 'warn' : 'good',
        to: buildUrl('/admin/supervision-candidates', {
          kind: 'supervision',
          search: userSearch,
          hourState: 'NEEDS_REVIEW',
        }),
      });
    }

    if ((supervisionRequired?.supervisor ?? 0) > 0) {
      summaryLines.push({
        label: 'Часы менторства',
        value: progressText(supervisionCurrent?.mentor, supervisionRequired?.supervisor),
        tone:
          (supervisionCurrent?.mentor ?? 0) >= supervisionRequired!.supervisor ? 'good' : 'bad',
        to: mentorshipUrl,
      });
      summaryLines.push({
        label: 'Заявки менторства на проверке',
        value: pendingMentorship,
        tone: pendingMentorship > 0 ? 'warn' : 'good',
        to: buildUrl('/admin/supervision-candidates', {
          kind: 'mentorship',
          search: userSearch,
          hourState: 'NEEDS_REVIEW',
        }),
      });
    }

    if ((ceuRequired?.total ?? 0) > 0) {
      summaryLines.push({
        label: 'CEU-баллы',
        value: progressText(ceuCurrent?.total, ceuRequired?.total, { cap: false }),
        tone: readiness?.ceu.ready ? 'good' : 'bad',
        to: buildUrl('/review/ceu', { search: userSearch }),
      });
    }

    if (isRenewal) {
      const renewalPayment =
        findPaymentForTarget(user.payments, 'RENEWAL', activeCycle.targetLevel) ?? null;
      summaryLines.push({
        label: 'Оплата ресертификации',
        value:
          renewalPayment?.status === 'PAID'
            ? 'Оплачено'
            : renewalPayment?.status === 'PENDING'
              ? 'На подтверждении'
              : 'Не оплачено',
        tone:
          renewalPayment?.status === 'PAID'
            ? 'good'
            : renewalPayment?.status === 'PENDING'
              ? 'warn'
              : 'bad',
      });
    } else if ((readiness?.payments.items ?? []).length > 0) {
      summaryLines.push({
        label: 'Оплаты',
        value: readiness?.payments.ready ? 'Оплачено' : 'Есть неоплаченные',
        tone: readiness?.payments.ready ? 'good' : 'bad',
      });
    }

    const examApplication = user.activeCycleExamApplication;
    summaryLines.push({
      label: 'Заявка на экзамен',
      value: examApplication
        ? (examStatusLabels[examApplication.status] ?? examApplication.status)
        : 'Не подана',
      tone: examApplication?.status === 'APPROVED' ? 'good' : examApplication ? 'warn' : 'bad',
      to: buildUrl('/exam-applications', { search: userSearch, status: 'ALL' }),
    });
  }

  const canReviewSupervision =
    activeGroupName === 'Супервизор' || activeGroupName === 'Опытный Супервизор';
  const canReviewMentorship = activeGroupName === 'Опытный Супервизор';

  if (canReviewSupervision) {
    const pending = Number(user.reviewerWorkload.supervisionPendingRequests ?? 0);
    reviewerLines.push({
      label: 'Проверка часов',
      value: pending,
      tone: pending > 0 ? 'warn' : 'good',
      to: buildUrl('/admin/supervision-candidates', {
        kind: 'supervision',
        reviewerSearch: userSearch,
        hourState: 'NEEDS_REVIEW',
      }),
    });
  }

  if (canReviewMentorship) {
    const pending = Number(user.reviewerWorkload.mentorshipPendingRequests ?? 0);
    reviewerLines.push({
      label: 'Проверка менторства',
      value: pending,
      tone: pending > 0 ? 'warn' : 'good',
      to: buildUrl('/admin/supervision-candidates', {
        kind: 'mentorship',
        reviewerSearch: userSearch,
        hourState: 'NEEDS_REVIEW',
      }),
    });
  }

  return {
    summaryLines,
    reviewerLines,
    requiresAttention:
      !activeCycle ||
      summaryLines.some((line) => line.tone === 'bad' || line.tone === 'warn') ||
      reviewerLines.some((line) => line.tone === 'warn'),
  };
}
