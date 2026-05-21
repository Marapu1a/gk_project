import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { docReviewStatusLabels, examStatusLabels, targetLevelLabels } from '@/utils/labels';

type Props = {
  user: any;
  activeGroupName: string | null;
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

function resolveTargetLabel(user: any) {
  const activeCycle = user.activeCycle;
  const targetLevel = activeCycle?.targetLevel ?? user.targetLevel;

  if (!targetLevel) return 'Не выбран';
  if (activeCycle?.type === 'RENEWAL' && targetLevel === 'SUPERVISOR') {
    return 'Опытный супервизор';
  }

  return targetLevelLabels[targetLevel] ?? targetLevel;
}

function countPendingHours(user: any, mode: 'supervision' | 'mentorship') {
  return (user.supervisionRecords ?? []).reduce((sum: number, record: any) => {
    const count = (record.hours ?? []).filter((hour: any) => {
      if (hour.status !== 'UNCONFIRMED') return false;
      const isMentorship = hour.type === 'SUPERVISOR';
      return mode === 'mentorship' ? isMentorship : !isMentorship;
    }).length;

    return sum + count;
  }, 0);
}

function documentStatus(user: any) {
  const readiness = user.examReadiness?.documents;
  const latestRequest = readiness?.request ?? user.documentReviewRequests?.[0] ?? null;

  if (readiness?.ready) return { label: 'Принято', tone: 'good' as const, to: latestRequest?.adminUrl };
  if (latestRequest) {
    const label = latestRequest.status === 'CONFIRMED'
      ? 'Принято'
      : latestRequest.status === 'REJECTED'
        ? 'Отклонено'
        : 'На проверке';

    return {
      label: docReviewStatusLabels[latestRequest.status] ?? label,
      tone: latestRequest.status === 'REJECTED' ? 'bad' as const : 'warn' as const,
      to: latestRequest.adminUrl ?? `/admin/document-review/${latestRequest.id}`,
    };
  }

  return { label: 'Нет заявки', tone: 'bad' as const, to: null };
}

function StatusPill({ tone, children }: { tone: 'good' | 'warn' | 'bad' | 'soft'; children: ReactNode }) {
  const className =
    tone === 'good'
      ? 'bg-[rgba(165,203,55,0.25)] text-[var(--color-blue-dark)]'
      : tone === 'bad'
        ? 'bg-[rgba(255,83,100,0.14)] text-[var(--color-danger)]'
        : tone === 'warn'
          ? 'bg-[#FFF0C2] text-[#8A6200]'
          : 'bg-[var(--color-blue-soft)] text-[var(--color-blue-dark)]';

  return (
    <span className={`inline-flex min-h-[26px] items-center rounded-full px-3 text-[12px] font-extrabold ${className}`}>
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
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/70 py-2 last:border-b-0">
      <span className="text-[14px] font-semibold text-[#1F305E]">{label}</span>
      {to ? (
        <Link to={to} className="shrink-0 underline decoration-[#1F305E]/35 underline-offset-4">
          <StatusPill tone={tone}>{value}</StatusPill>
        </Link>
      ) : (
        <StatusPill tone={tone}>{value}</StatusPill>
      )}
    </div>
  );
}

export function AdminCandidateSummaryBlock({ user, activeGroupName }: Props) {
  const readiness = user.examReadiness;
  const docs = documentStatus(user);
  const latestCertificate = user.latestCertificate;
  const examApplication = user.activeCycleExamApplication;
  const supervisionCurrent = readiness?.supervision?.current;
  const supervisionRequired = readiness?.supervision?.required;
  const ceuCurrent = readiness?.ceu?.current;
  const ceuRequired = readiness?.ceu?.required;
  const missing = readiness?.missing ?? [];

  const activeCycleText = user.activeCycle
    ? `${cycleTypeLabels[user.activeCycle.type] ?? user.activeCycle.type} — ${
        targetLevelLabels[user.activeCycle.targetLevel] ?? user.activeCycle.targetLevel
      } · с ${formatDate(user.activeCycle.startedAt)}`
    : 'Нет активного цикла';

  const supervisionValue = supervisionRequired?.supervisor
    ? `${formatNumber(supervisionCurrent?.mentor)} / ${formatNumber(supervisionRequired.supervisor)}`
    : `${formatNumber(supervisionCurrent?.supervision)} / ${formatNumber(supervisionRequired?.supervision)}`;

  return (
    <section className="rounded-[22px] bg-white px-6 py-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="dashboard-v2-title">Сводка по кандидату</h2>
          <p className="mt-1 text-[13px] font-semibold text-[#8D96B5]">
            Быстрая картина по активному циклу, заявкам и оплатам
          </p>
        </div>

        <StatusPill tone={readiness?.ready ? 'good' : 'bad'}>
          {readiness?.ready ? 'Готов к экзамену' : 'Требует внимания'}
        </StatusPill>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-[16px] bg-[var(--color-blue-soft)] p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Meta label="ФИО" value={user.fullName || '—'} />
            <Meta label="Email" value={user.email || '—'} />
            <Meta label="Группа" value={activeGroupName || '—'} />
            <Meta label="Сертификат до" value={formatDate(latestCertificate?.expiresAt)} />
            <Meta label="Целевой уровень" value={resolveTargetLabel(user)} />
            <Meta label="Активный цикл" value={activeCycleText} />
          </div>
        </div>

        <div className="rounded-[16px] bg-[var(--color-blue-soft)] p-4">
          <SummaryLine label="Документы" value={docs.label} tone={docs.tone} to={docs.to} />
          <SummaryLine
            label="Часы супервизии / менторства"
            value={supervisionValue}
            tone={readiness?.supervision?.ready ? 'good' : 'bad'}
          />
          <SummaryLine
            label="CEU-баллы"
            value={`${formatNumber(ceuCurrent?.total)} / ${formatNumber(ceuRequired?.total)}`}
            tone={readiness?.ceu?.ready ? 'good' : 'bad'}
          />
          <SummaryLine
            label="Заявки на супервизию"
            value={countPendingHours(user, 'supervision')}
            tone={countPendingHours(user, 'supervision') > 0 ? 'warn' : 'good'}
          />
          <SummaryLine
            label="Заявки на менторство"
            value={countPendingHours(user, 'mentorship')}
            tone={countPendingHours(user, 'mentorship') > 0 ? 'warn' : 'good'}
          />
          <SummaryLine
            label="Оплаты"
            value={readiness?.payments?.ready ? 'Оплачено' : 'Есть неоплаченные'}
            tone={readiness?.payments?.ready ? 'good' : 'bad'}
          />
          <SummaryLine
            label="Заявка на экзамен"
            value={
              examApplication
                ? examStatusLabels[examApplication.status] ?? examApplication.status
                : 'Не подана'
            }
            tone={examApplication?.status === 'APPROVED' ? 'good' : examApplication ? 'warn' : 'bad'}
          />
        </div>
      </div>

      <div className="mt-4 rounded-[16px] bg-[#F7F8FA] p-4">
        <div className="mb-2 text-[14px] font-extrabold text-[#1F305E]">
          Комментарий администратора
        </div>
        <textarea
          className="input-design min-h-[72px] resize-y py-2"
          placeholder="Поле для служебных заметок добавим следующим шагом"
          disabled
        />
      </div>

      {missing.length ? (
        <div className="mt-4 rounded-[14px] bg-[rgba(255,83,100,0.08)] px-4 py-3 text-[13px] font-semibold text-[var(--color-danger)]">
          Не готово: {missing.join(', ')}
        </div>
      ) : null}
    </section>
  );
}

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-[12px] font-semibold text-[#8D96B5]">{label}</div>
      <div className="mt-0.5 text-[15px] font-extrabold text-[#1F305E]">{value}</div>
    </div>
  );
}
