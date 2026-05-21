import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { docReviewStatusLabels, examStatusLabels, targetLevelLabels } from '@/utils/labels';
import { useUserActionLog } from '../hooks/useUserActionLog';
import { useCreateUserNote } from '../hooks/useCreateUserNote';
import { useDeleteUserNote } from '../hooks/useDeleteUserNote';
import { LONG_TEXT_MAX_LENGTH } from '@/utils/formLimits';
import { useConfirm } from '@/components/confirm/ConfirmProvider';

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

function getRenewalPayment(user: any) {
  const cycle = user.activeCycle;
  if (!cycle || cycle.type !== 'RENEWAL') return null;

  return (
    (user.payments ?? []).find(
      (payment: any) => payment.type === 'RENEWAL' && payment.targetLevel === cycle.targetLevel,
    ) ?? null
  );
}

function documentStatus(user: any) {
  const readiness = user.examReadiness?.documents;
  const latestRequest = readiness?.request ?? user.documentReviewRequests?.[0] ?? null;

  if (readiness?.ready)
    return { label: 'Принято', tone: 'good' as const, to: latestRequest?.adminUrl };
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
    };
  }

  return { label: 'Нет заявки', tone: 'bad' as const, to: null };
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
  const { data: actionLog = [] } = useUserActionLog(user.id);
  const createNote = useCreateUserNote(user.id);
  const deleteNote = useDeleteUserNote(user.id);
  const { confirm } = useConfirm();
  const [noteText, setNoteText] = useState('');

  const readiness = user.examReadiness;
  const docs = documentStatus(user);
  const latestCertificate = user.latestCertificate;
  const examApplication = user.activeCycleExamApplication;
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

  const notes = useMemo(
    () =>
      actionLog
        .filter((log) => log.action === 'Заметка администратора' && log.details)
        .slice()
        .reverse(),
    [actionLog],
  );

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
        to: docs.to,
      });
    }

    if ((supervisionRequired?.practice ?? 0) > 0) {
      lines.push({
        label: 'Часы практики',
        value: `${formatNumber(supervisionCurrent?.practice)} / ${formatNumber(supervisionRequired?.practice)}`,
        tone:
          (supervisionCurrent?.practice ?? 0) >= (supervisionRequired?.practice ?? 0)
            ? 'good'
            : 'bad',
      });
    }

    if ((supervisionRequired?.supervision ?? 0) > 0) {
      lines.push({
        label: 'Часы супервизии',
        value: `${formatNumber(supervisionCurrent?.supervision)} / ${formatNumber(supervisionRequired?.supervision)}`,
        tone:
          (supervisionCurrent?.supervision ?? 0) >= (supervisionRequired?.supervision ?? 0)
            ? 'good'
            : 'bad',
      });
      lines.push({
        label: 'Часы на проверке',
        value: pendingSupervision,
        tone: pendingSupervision > 0 ? 'warn' : 'good',
      });
    }

    if ((supervisionRequired?.supervisor ?? 0) > 0) {
      lines.push({
        label: 'Часы менторства',
        value: `${formatNumber(supervisionCurrent?.mentor)} / ${formatNumber(supervisionRequired?.supervisor)}`,
        tone:
          (supervisionCurrent?.mentor ?? 0) >= (supervisionRequired?.supervisor ?? 0)
            ? 'good'
            : 'bad',
      });
      lines.push({
        label: 'Менторство на проверке',
        value: pendingMentorship,
        tone: pendingMentorship > 0 ? 'warn' : 'good',
      });
    }

    if ((ceuRequired?.total ?? 0) > 0) {
      lines.push({
        label: 'CEU-баллы',
        value: `${formatNumber(ceuCurrent?.total)} / ${formatNumber(ceuRequired?.total)}`,
        tone: readiness?.ceu?.ready ? 'good' : 'bad',
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
    });

    return lines;
  }, [
    activeCycle,
    ceuCurrent?.total,
    ceuRequired?.total,
    docs.label,
    docs.to,
    docs.tone,
    examApplication,
    isRenewal,
    pendingMentorship,
    pendingSupervision,
    readiness?.ceu?.ready,
    readiness?.payments?.items,
    readiness?.payments?.ready,
    renewalPayment?.status,
    supervisionCurrent?.mentor,
    supervisionCurrent?.practice,
    supervisionCurrent?.supervision,
    supervisionRequired?.practice,
    supervisionRequired?.supervision,
    supervisionRequired?.supervisor,
  ]);

  const requiresAttention =
    !activeCycle || summaryLines.some((line) => line.tone === 'bad' || line.tone === 'warn');

  const saveNote = async () => {
    const text = noteText.trim();
    if (!text) {
      toast.info('Напишите текст заметки');
      return;
    }

    try {
      await createNote.mutateAsync(text);
      setNoteText('');
      toast.success('Заметка сохранена');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось сохранить заметку');
    }
  };

  const removeNote = async (noteId: string) => {
    const ok = await confirm({
      message: 'Удалить заметку администратора?',
      confirmLabel: 'Удалить',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await deleteNote.mutateAsync(noteId);
      toast.success('Заметка удалена');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось удалить заметку');
    }
  };

  return (
    <section className="rounded-[22px] bg-white px-6 py-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="dashboard-v2-title">Сводка по кандидату</h2>
          <p className="mt-1 text-[13px] font-semibold text-[#8D96B5]">
            Быстрая картина по активному циклу, заявкам и оплатам
          </p>
        </div>

        <StatusPill tone={requiresAttention ? 'bad' : 'good'}>
          {requiresAttention ? 'Требует внимания' : 'Готов к экзамену'}
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
            <Meta label="Активный процесс" value={activeCycleText} />
          </div>
        </div>

        <div className="rounded-[16px] bg-[var(--color-blue-soft)] p-4">
          {summaryLines.length ? (
            summaryLines.map((line) => (
              <SummaryLine
                key={line.label}
                label={line.label}
                value={line.value}
                tone={line.tone}
                to={line.to}
              />
            ))
          ) : (
            <div className="rounded-[14px] bg-white px-4 py-3 text-[14px] font-semibold text-[#8D96B5]">
              Активный процесс не выбран. Требования появятся после выбора цели сертификации или
              ресертификации.
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-[16px] bg-[#F7F8FA] p-4">
        <div className="mb-2 text-[14px] font-extrabold text-[#1F305E]">Заметки администратора</div>
        <textarea
          className="input-design min-h-[72px] resize-y py-2"
          placeholder="Напишите служебную заметку"
          value={noteText}
          onChange={(event) => setNoteText(event.target.value)}
          maxLength={LONG_TEXT_MAX_LENGTH}
          disabled={createNote.isPending}
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="btn dashboard-v2-action dashboard-v2-action-primary"
            onClick={saveNote}
            disabled={createNote.isPending || !noteText.trim()}
          >
            Сохранить
          </button>
        </div>

        {notes.length ? (
          <ol className="mt-4 space-y-2">
            {notes.map((note, index) => (
              <li
                key={note.id}
                className="grid gap-3 rounded-[12px] bg-white px-4 py-3 text-[14px] text-[#1F305E] sm:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <div className="font-semibold">
                    {index + 1}. {note.details}
                  </div>
                  <div className="mt-1 text-[12px] font-semibold text-[#8D96B5]">
                    {formatDate(note.createdAt)} · {note.adminEmail}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-danger self-start px-3 py-1 text-xs"
                  onClick={() => removeNote(note.id)}
                  disabled={deleteNote.isPending}
                >
                  Удалить
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-[13px] font-semibold text-[#8D96B5]">Заметок пока нет.</p>
        )}
      </div>
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
