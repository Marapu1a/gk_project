import {
  useEffect,
  useRef,
  useMemo,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  docReviewStatusLabels,
  examStatusLabels,
  formatCertificationLevelName,
  targetLevelLabels,
} from '@/utils/labels';
import { formatCertificateDate } from '@/features/certificate/utils/certificateDates';
import { UI_TOAST_MESSAGES } from '@/utils/uiMessages';
import { findPaymentForTarget } from '@/features/payment/model/paymentPolicy';

type Props = {
  user: any;
  activeGroupName: string | null;
  onOpenStatusManagement?: () => void;
};

const cycleTypeLabels: Record<string, string> = {
  CERTIFICATION: 'сертификация',
  RENEWAL: 'ресертификация',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ru-RU');
}

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

function resolveTargetLabel(user: any) {
  const activeCycle = user.activeCycle;
  const targetLevel = activeCycle?.targetLevel ?? user.targetLevel;

  if (!targetLevel) return 'Не выбрана';
  if (activeCycle?.type === 'RENEWAL' && targetLevel === 'SUPERVISOR') {
    return 'Опытный супервизор';
  }

  return targetLevelLabels[targetLevel] ?? targetLevel;
}

function resolveProcessLabel(user: any, activeGroupName: string | null) {
  const cycle = user.activeCycle;
  if (!cycle) return 'Нет активного процесса';

  const baseLevel =
    cycle.type === 'RENEWAL' &&
    cycle.targetLevel === 'SUPERVISOR' &&
    (activeGroupName === 'Супервизор' || activeGroupName === 'Опытный Супервизор')
      ? activeGroupName === 'Опытный Супервизор'
        ? 'Опытный супервизор'
        : 'Супервизор -> Опытный супервизор'
      : (targetLevelLabels[cycle.targetLevel] ?? cycle.targetLevel);

  return `${cycleTypeLabels[cycle.type] ?? cycle.type} — ${baseLevel} · с ${formatDate(cycle.startedAt)}`;
}

function latestCertificateText(certificate: any) {
  if (!certificate) return 'нет';

  const group = certificate.group?.name
    ? formatCertificationLevelName(certificate.group.name)
    : (certificate.title ?? 'Сертификат');
  const expiresAt = certificate.expiresAt
    ? `до ${formatCertificateDate(certificate.expiresAt)}`
    : 'бессрочно';
  return `${group} · ${expiresAt}`;
}

function countPendingHours(user: any, mode: 'supervision' | 'mentorship') {
  const activeCycleId = user.activeCycle?.id;

  return (user.supervisionRecords ?? []).reduce((sum: number, record: any) => {
    if (activeCycleId && record.cycleId !== activeCycleId) return sum;

    const count = (record.hours ?? []).filter((hour: any) => {
      if (hour.status !== 'UNCONFIRMED') return false;
      const isMentorship = hour.type === 'SUPERVISOR';
      return mode === 'mentorship' ? isMentorship : !isMentorship;
    }).length;

    return sum + count;
  }, 0);
}

function reviewerWorkloadValue(
  user: any,
  key: 'supervisionPendingRequests' | 'mentorshipPendingRequests',
) {
  return Number(user.reviewerWorkload?.[key] ?? 0);
}

function getRenewalPayment(user: any) {
  const cycle = user.activeCycle;
  if (!cycle || cycle.type !== 'RENEWAL') return null;

  return findPaymentForTarget(user.payments ?? [], 'RENEWAL', cycle.targetLevel) ?? null;
}

function documentStatus(user: any) {
  const readiness = user.examReadiness?.documents;
  const latestRequest = readiness?.request ?? null;
  const hasArchivedRequests = Boolean(user.documentReviewRequests?.length);

  if (readiness?.ready)
    return {
      label: 'Принято',
      tone: 'good' as const,
      to: latestRequest?.adminUrl,
      mode: 'history' as const,
    };
  if (latestRequest) {
    const label =
      latestRequest.status === 'CONFIRMED'
        ? 'Принято'
        : latestRequest.status === 'REJECTED'
          ? 'Отклонено'
          : 'На проверке';

    return {
      label: docReviewStatusLabels[latestRequest.status] ?? label,
      tone: latestRequest.status === 'REJECTED' ? ('bad' as const) : ('warn' as const),
      to: latestRequest.adminUrl ?? `/admin/document-review/${latestRequest.id}`,
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
      to: null,
      mode: 'history' as const,
    };
  }

  return { label: 'Нет заявки', tone: 'bad' as const, to: null, mode: 'active' as const };
}

function StatusPill({
  tone,
  children,
}: {
  tone: 'good' | 'warn' | 'bad' | 'soft';
  children: ReactNode;
}) {
  const className =
    tone === 'good'
      ? 'bg-[rgba(165,203,55,0.25)] text-[var(--color-blue-dark)]'
      : tone === 'bad'
        ? 'bg-[rgba(255,83,100,0.14)] text-[var(--color-danger)]'
        : tone === 'warn'
          ? 'bg-[#FFF0C2] text-[#8A6200]'
          : 'bg-[var(--color-blue-soft)] text-[var(--color-blue-dark)]';

  return (
    <span
      className={`inline-flex min-h-[26px] items-center rounded-full px-3 text-[12px] font-extrabold ${className}`}
    >
      {children}
    </span>
  );
}

function SummaryLine({
  label,
  value,
  tone = 'soft',
  to,
}: {
  label: string;
  value: ReactNode;
  tone?: 'good' | 'warn' | 'bad' | 'soft';
  to?: string | null;
}) {
  const rowClass = to
    ? 'group -mx-2 flex items-center justify-between gap-3 rounded-[10px] border-b border-white/70 px-2 py-2 transition hover:bg-white/60 last:border-b-0'
    : 'flex items-center justify-between gap-3 border-b border-white/70 py-2 last:border-b-0';

  return (
    <div className={rowClass}>
      {to ? (
        <Link
          to={to}
          className="inline-flex min-w-0 cursor-pointer items-center gap-1 text-[14px] font-semibold text-[#1F305E] transition group-hover:text-[var(--color-blue-darker)]"
          title={`Открыть раздел: ${label}`}
        >
          <span className="truncate">{label}</span>
          <ChevronRight
            size={15}
            strokeWidth={2.4}
            className="shrink-0 opacity-45 transition group-hover:translate-x-0.5 group-hover:opacity-100"
            aria-hidden="true"
          />
        </Link>
      ) : (
        <span className="text-[14px] font-semibold text-[#1F305E]">{label}</span>
      )}
      <StatusPill tone={tone}>{value}</StatusPill>
    </div>
  );
}

export function AdminCandidateSummaryBlock({
  user,
  activeGroupName,
  onOpenStatusManagement,
}: Props) {
  const readiness = user.examReadiness;
  const docs = documentStatus(user);
  const latestCertificate = user.latestCertificate;
  const examApplication = user.activeCycleExamApplication;
  const [openTooltipKey, setOpenTooltipKey] = useState<string | null>(null);
  const supervisionCurrent = readiness?.supervision?.current;
  const supervisionRequired = readiness?.supervision?.required;
  const ceuCurrent = readiness?.ceu?.current;
  const ceuRequired = readiness?.ceu?.required;
  const activeCycle = user.activeCycle;
  const isRenewal = activeCycle?.type === 'RENEWAL';
  const renewalPayment = getRenewalPayment(user);

  const activeCycleText = resolveProcessLabel(user, activeGroupName);

  const pendingSupervision = countPendingHours(user, 'supervision');
  const pendingMentorship = countPendingHours(user, 'mentorship');
  const userSearch = user.email || user.fullName || '';
  const documentReviewUrl = buildUrl('/admin/document-review', {
    search: userSearch,
    mode: docs.mode,
  });
  const supervisionUrl = buildUrl('/admin/supervision-candidates', {
    kind: 'supervision',
    search: userSearch,
  });
  const supervisionNeedsReviewUrl = buildUrl('/admin/supervision-candidates', {
    kind: 'supervision',
    search: userSearch,
    hourState: 'NEEDS_REVIEW',
  });
  const mentorshipUrl = buildUrl('/admin/supervision-candidates', {
    kind: 'mentorship',
    search: userSearch,
  });
  const mentorshipNeedsReviewUrl = buildUrl('/admin/supervision-candidates', {
    kind: 'mentorship',
    search: userSearch,
    hourState: 'NEEDS_REVIEW',
  });
  const reviewerSupervisionNeedsReviewUrl = buildUrl('/admin/supervision-candidates', {
    kind: 'supervision',
    reviewerSearch: userSearch,
    hourState: 'NEEDS_REVIEW',
  });
  const reviewerMentorshipNeedsReviewUrl = buildUrl('/admin/supervision-candidates', {
    kind: 'mentorship',
    reviewerSearch: userSearch,
    hourState: 'NEEDS_REVIEW',
  });
  const ceuReviewUrl = buildUrl('/review/ceu', { search: userSearch });
  const certificateIssueUrl = buildUrl('/certificate', { email: user.email });
  const examApplicationsUrl = buildUrl('/exam-applications', {
    search: userSearch,
    status: 'ALL',
  });
  const canReviewSupervision =
    activeGroupName === 'Супервизор' || activeGroupName === 'Опытный Супервизор';
  const canReviewMentorship = activeGroupName === 'Опытный Супервизор';
  const reviewerSupervisionPending = reviewerWorkloadValue(user, 'supervisionPendingRequests');
  const reviewerMentorshipPending = reviewerWorkloadValue(user, 'mentorshipPendingRequests');

  const summaryLines = useMemo(() => {
    if (!activeCycle) return [];

    const lines: Array<{
      label: string;
      value: ReactNode;
      tone: 'good' | 'warn' | 'bad' | 'soft';
      to?: string | null;
    }> = [];

    if (!isRenewal) {
      lines.push({
        label: 'Документы',
        value: docs.label,
        tone: docs.tone,
        to: documentReviewUrl,
      });
    }

    if ((supervisionRequired?.practice ?? 0) > 0) {
      lines.push({
        label: 'Часы практики',
        value: progressText(supervisionCurrent?.practice, supervisionRequired?.practice),
        tone:
          (supervisionCurrent?.practice ?? 0) >= (supervisionRequired?.practice ?? 0)
            ? 'good'
            : 'bad',
        to: supervisionUrl,
      });
    }

    if ((supervisionRequired?.supervision ?? 0) > 0) {
      lines.push({
        label: 'Часы супервизии',
        value: progressText(supervisionCurrent?.supervision, supervisionRequired?.supervision),
        tone:
          (supervisionCurrent?.supervision ?? 0) >= (supervisionRequired?.supervision ?? 0)
            ? 'good'
            : 'bad',
        to: supervisionUrl,
      });
      lines.push({
        label: 'Заявки часов на проверке',
        value: pendingSupervision,
        tone: pendingSupervision > 0 ? 'warn' : 'good',
        to: supervisionNeedsReviewUrl,
      });
    }

    if ((supervisionRequired?.supervisor ?? 0) > 0) {
      lines.push({
        label: 'Часы менторства',
        value: progressText(supervisionCurrent?.mentor, supervisionRequired?.supervisor),
        tone:
          (supervisionCurrent?.mentor ?? 0) >= (supervisionRequired?.supervisor ?? 0)
            ? 'good'
            : 'bad',
        to: mentorshipUrl,
      });
      lines.push({
        label: 'Заявки менторства на проверке',
        value: pendingMentorship,
        tone: pendingMentorship > 0 ? 'warn' : 'good',
        to: mentorshipNeedsReviewUrl,
      });
    }

    if ((ceuRequired?.total ?? 0) > 0) {
      lines.push({
        label: 'CEU-баллы',
        value: progressText(ceuCurrent?.total, ceuRequired?.total, { cap: false }),
        tone: readiness?.ceu?.ready ? 'good' : 'bad',
        to: ceuReviewUrl,
      });
    }

    if (isRenewal) {
      lines.push({
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
    } else if ((readiness?.payments?.items ?? []).length > 0) {
      lines.push({
        label: 'Оплаты',
        value: readiness?.payments?.ready ? 'Оплачено' : 'Есть неоплаченные',
        tone: readiness?.payments?.ready ? 'good' : 'bad',
      });
    }

    lines.push({
      label: 'Заявка на экзамен',
      value: examApplication
        ? (examStatusLabels[examApplication.status] ?? examApplication.status)
        : 'Не подана',
      tone: examApplication?.status === 'APPROVED' ? 'good' : examApplication ? 'warn' : 'bad',
      to: examApplicationsUrl,
    });

    return lines;
  }, [
    activeCycle,
    ceuCurrent?.total,
    ceuRequired?.total,
    ceuReviewUrl,
    documentReviewUrl,
    docs.label,
    docs.tone,
    examApplication,
    examApplicationsUrl,
    isRenewal,
    mentorshipNeedsReviewUrl,
    mentorshipUrl,
    pendingMentorship,
    pendingSupervision,
    readiness?.ceu?.ready,
    readiness?.payments?.items,
    readiness?.payments?.ready,
    renewalPayment?.status,
    supervisionCurrent?.mentor,
    supervisionCurrent?.practice,
    supervisionCurrent?.supervision,
    supervisionNeedsReviewUrl,
    supervisionRequired?.practice,
    supervisionRequired?.supervision,
    supervisionRequired?.supervisor,
    supervisionUrl,
  ]);

  const reviewerLines = useMemo(() => {
    const lines: Array<{
      label: string;
      value: ReactNode;
      tone: 'good' | 'warn' | 'bad' | 'soft';
      to?: string | null;
    }> = [];

    if (canReviewSupervision) {
      lines.push({
        label: 'Проверка часов',
        value: reviewerSupervisionPending,
        tone: reviewerSupervisionPending > 0 ? 'warn' : 'good',
        to: reviewerSupervisionNeedsReviewUrl,
      });
    }

    if (canReviewMentorship) {
      lines.push({
        label: 'Проверка менторства',
        value: reviewerMentorshipPending,
        tone: reviewerMentorshipPending > 0 ? 'warn' : 'good',
        to: reviewerMentorshipNeedsReviewUrl,
      });
    }

    return lines;
  }, [
    canReviewMentorship,
    canReviewSupervision,
    reviewerMentorshipNeedsReviewUrl,
    reviewerMentorshipPending,
    reviewerSupervisionNeedsReviewUrl,
    reviewerSupervisionPending,
  ]);

  const requiresAttention =
    !activeCycle ||
    summaryLines.some((line) => line.tone === 'bad' || line.tone === 'warn') ||
    reviewerLines.some((line) => line.tone === 'warn');

  return (
    <section className="rounded-[14px] bg-white px-3 py-4 shadow-soft sm:rounded-[22px] sm:px-6 sm:py-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="dashboard-v2-title">Сводка по специалисту</h2>
          <p className="mt-1 text-[13px] font-semibold text-[#8D96B5]">
            Быстрая картина по активному циклу, заявкам и оплатам
          </p>
        </div>

        <StatusPill tone={requiresAttention ? 'bad' : 'good'}>
          {requiresAttention ? 'Требует внимания' : 'Готов к экзамену'}
        </StatusPill>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="min-w-0 rounded-[12px] bg-[var(--color-blue-soft)] p-3 sm:rounded-[16px] sm:p-4">
          <div className="grid grid-cols-1 min-w-0 gap-3 md:grid-cols-2">
            <Meta
              label="ФИО"
              value={user.fullName || '—'}
              tooltipKey="fullName"
              openTooltipKey={openTooltipKey}
              setOpenTooltipKey={setOpenTooltipKey}
            />
            <Meta
              label="ФИО латиницей"
              value={user.fullNameLatin || '—'}
              tooltipKey="fullNameLatin"
              openTooltipKey={openTooltipKey}
              setOpenTooltipKey={setOpenTooltipKey}
            />
            <Meta
              label="Уровень сертификации"
              value={formatCertificationLevelName(activeGroupName)}
            />
            <Meta
              label="Email"
              value={user.email || '—'}
              tooltipKey="email"
              openTooltipKey={openTooltipKey}
              setOpenTooltipKey={setOpenTooltipKey}
            />
            <Meta label="Цель сертификации" value={resolveTargetLabel(user)} />
            <Meta label="Последний сертификат" value={latestCertificateText(latestCertificate)} />
            <Meta label="Активная сертификация" value={activeCycleText} wide />
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-3 border-t border-white/70 pt-4">
            {onOpenStatusManagement ? (
              <button
                type="button"
                className="btn dashboard-v2-action dashboard-v2-action-secondary"
                onClick={onOpenStatusManagement}
              >
                Уровень и сертификат
              </button>
            ) : null}
            <Link
              to={certificateIssueUrl}
              className="btn dashboard-v2-action bg-[var(--color-blue-dark)] text-white hover:bg-[var(--color-blue-darker)]"
            >
              Выдать сертификат
            </Link>
          </div>
        </div>

        <div className="min-w-0 rounded-[12px] bg-[var(--color-blue-soft)] p-3 sm:rounded-[16px] sm:p-4">
          {summaryLines.length || reviewerLines.length ? (
            <>
              {summaryLines.map((line) => (
                <SummaryLine
                  key={line.label}
                  label={line.label}
                  value={line.value}
                  tone={line.tone}
                  to={line.to}
                />
              ))}

              {reviewerLines.length ? (
                <div className={summaryLines.length ? 'mt-3 border-t border-white/80 pt-3' : ''}>
                  <div className="mb-1 px-1 text-[12px] font-extrabold uppercase tracking-[0.02em] text-[#8D96B5]">
                    Работа проверяющего
                  </div>
                  {reviewerLines.map((line) => (
                    <SummaryLine
                      key={line.label}
                      label={line.label}
                      value={line.value}
                      tone={line.tone}
                      to={line.to}
                    />
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-[14px] bg-white px-4 py-3 text-[14px] font-semibold text-[#8D96B5]">
              Активный процесс не выбран. Требования появятся после выбора цели сертификации или
              ресертификации.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const COPY_ICON = '/dashboard-v2/icon_copy.svg';
const TOOLTIP_CLOSE_DELAY_MS = 1800;

function CopyableTruncatedValue({
  value,
  tooltipKey,
  openTooltipKey,
  setOpenTooltipKey,
}: {
  value: string;
  tooltipKey: string;
  openTooltipKey: string | null;
  setOpenTooltipKey: (key: string | null) => void;
}) {
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const hasValue = value.trim() && value !== '—';
  const isOpen = openTooltipKey === tooltipKey;

  const clearCloseTimer = () => {
    if (closeTimerRef.current == null) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  };

  const openTooltip = () => {
    clearCloseTimer();
    setOpenTooltipKey(tooltipKey);
  };

  const scheduleCloseTooltip = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpenTooltipKey(null);
      closeTimerRef.current = null;
    }, TOOLTIP_CLOSE_DELAY_MS);
  };

  const handleBlur = (event: FocusEvent<HTMLSpanElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    scheduleCloseTooltip();
  };

  const copyValue = async (event?: MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    if (!hasValue) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(UI_TOAST_MESSAGES.admin.valueCopied);
    } catch {
      toast.error(UI_TOAST_MESSAGES.admin.valueCopyFailed);
    }
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      clearCloseTimer();
      setOpenTooltipKey(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen, setOpenTooltipKey]);

  useEffect(
    () => () => {
      clearCloseTimer();
    },
    [],
  );

  if (!hasValue) {
    return <span>—</span>;
  }

  return (
    <span
      ref={rootRef}
      className="relative inline-flex max-w-full min-w-0 items-center gap-1"
      onMouseEnter={openTooltip}
      onMouseLeave={scheduleCloseTooltip}
      onFocus={openTooltip}
      onBlur={handleBlur}
    >
      <button
        type="button"
        className="max-w-full min-w-0 cursor-pointer truncate text-left transition hover:text-[var(--color-blue-darker)]"
        onClick={() => {
          clearCloseTimer();
          setOpenTooltipKey(isOpen ? null : tooltipKey);
        }}
        title={value}
      >
        {value}
      </button>

      {isOpen ? (
        <span
          className="absolute left-0 top-full z-30 mt-2 w-max max-w-[min(520px,calc(100vw-64px))] rounded-[12px] bg-white px-3 py-2 text-[13px] font-semibold leading-[1.35] text-[#1F305E] shadow-[0_6px_22px_rgba(31,48,94,0.18)]"
          onMouseEnter={openTooltip}
          onMouseLeave={scheduleCloseTooltip}
        >
          <span className="block break-all pr-8">{value}</span>
          <button
            type="button"
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-[6px] transition hover:bg-[var(--color-blue-soft)]"
            onClick={copyValue}
            aria-label="Скопировать значение"
          >
            <img src={COPY_ICON} alt="" className="h-[14px] w-[14px]" />
          </button>
        </span>
      ) : null}
    </span>
  );
}

function Meta({
  label,
  value,
  wide = false,
  tooltipKey,
  openTooltipKey,
  setOpenTooltipKey,
}: {
  label: string;
  value: string;
  wide?: boolean;
  tooltipKey?: string;
  openTooltipKey?: string | null;
  setOpenTooltipKey?: (key: string | null) => void;
}) {
  const canShowTooltip = Boolean(tooltipKey && setOpenTooltipKey);

  return (
    <div className={`min-w-0 ${wide ? 'md:col-span-2' : ''}`}>
      <div className="text-[12px] font-semibold text-[#8D96B5]">{label}</div>
      <div className="mt-0.5 min-w-0 text-[15px] font-extrabold text-[#1F305E]">
        {canShowTooltip ? (
          <CopyableTruncatedValue
            value={value}
            tooltipKey={tooltipKey as string}
            openTooltipKey={openTooltipKey ?? null}
            setOpenTooltipKey={setOpenTooltipKey as (key: string | null) => void}
          />
        ) : (
          <span className="block truncate" title={value}>
            {value}
          </span>
        )}
      </div>
    </div>
  );
}
