import { useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { usePatchExamAppStatus } from '../hooks/usePatchExamAppStatus';
import { useExamAppDetails } from '../hooks/useExamAppDetails';
import type { ExamApp, ExamReadinessDetails, ExamStatus } from '../api/getMyExamApp';
import { COMMENT_MAX_LENGTH } from '@/utils/formLimits';
import { examStatusLabels, targetLevelLabels } from '@/utils/labels';
import { UI_TOAST_MESSAGES } from '@/utils/uiMessages';
import { ModalCloseButton } from '@/components/ModalCloseButton';

export type ExamAppModalProps = {
  app: ExamApp;
  onClose: () => void;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('ru-RU');
}

function formatNumber(value?: number | null) {
  if (value == null) return '-';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function capToRequired(value?: number | null, required?: number | null) {
  const current = Math.max(0, Number(value ?? 0));
  const max = Number(required ?? 0);
  if (max <= 0) return current;
  return Math.min(current, max);
}

function statusText(status: ExamStatus) {
  return examStatusLabels[status] ?? status;
}

function examGoalLabel(summary: ExamReadinessDetails['readiness'] | null, app: ExamApp) {
  const cycle = summary?.activeCycle ?? app.cycle ?? null;
  const currentGroup = summary?.user.currentGroup?.name ?? '';

  if (!cycle?.targetLevel) return '-';

  if (cycle.type === 'RENEWAL') {
    if (
      cycle.targetLevel === 'SUPERVISOR' &&
      (currentGroup === 'Супервизор' || currentGroup === 'Опытный Супервизор')
    ) {
      return 'Ресертификация: Супервизор -> Опытный Супервизор';
    }

    return `Ресертификация: ${targetLevelLabels[cycle.targetLevel]}`;
  }

  return targetLevelLabels[cycle.targetLevel] ?? cycle.targetLevel;
}

function applicationDateLabel(status: ExamStatus, submittedAt?: string | null) {
  if (status === 'NOT_SUBMITTED') return 'не подавалась';
  return formatDate(submittedAt);
}

function reviewDateLabel(status: ExamStatus, reviewedAt?: string | null) {
  if (status === 'APPROVED' || status === 'REJECTED') return formatDate(reviewedAt);
  return 'еще не рассматривалась';
}

export default function ExamAppModal({ app, onClose }: ExamAppModalProps) {
  const [comment, setComment] = useState(app.comment ?? '');
  const mutation = usePatchExamAppStatus();
  const details = useExamAppDetails(app.userId, app.id);
  const summary = details.data?.readiness ?? null;
  const currentApp = details.data?.application ?? app;
  const disabled = mutation.isPending || details.isLoading;

  const doChange = (next: ExamStatus) => {
    const trimmedComment = comment.trim();
    if (next === 'REJECTED' && !trimmedComment) {
      toast.error(UI_TOAST_MESSAGES.exam.rejectReasonRequired);
      return;
    }

    mutation.mutate(
      { userId: app.userId, applicationId: app.id, status: next, comment: trimmedComment },
      {
        onSuccess: () => {
          const message =
            next === 'APPROVED'
              ? 'Заявка на экзамен одобрена'
              : next === 'REJECTED'
                ? 'Заявка на экзамен отклонена'
                : next === 'PENDING'
                  ? 'Заявка возвращена на рассмотрение'
                  : 'Заявка сброшена';

          toast.success(message);
          onClose();
        },
        onError: (err: any) => {
          toast.error(
            err?.response?.data?.message ||
              err?.response?.data?.error ||
              UI_TOAST_MESSAGES.exam.statusUpdateFailed,
          );
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="relative max-h-[92vh] w-full max-w-[1080px] overflow-y-auto rounded-[16px] bg-white px-6 py-6 shadow-[0_12px_32px_rgba(0,0,0,0.24)]">
        <ModalCloseButton onClick={onClose} />

        <h3 className="dashboard-v2-page-title mb-5 text-center">Заявка на экзамен</h3>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <section className="space-y-5">
            <div className="rounded-[10px] bg-[var(--color-blue-soft)] px-4 py-4">
              <h4 className="dashboard-v2-title mb-3">Специалист</h4>
              <InfoRow label="ФИО" value={summary?.user.fullName || app.user.fullName || '-'} />
              <InfoRow label="Email" value={summary?.user.email || app.user.email} />
              <InfoRow
                label="Уровень"
                value={summary?.user.currentGroup?.name || '-'}
              />
              <InfoRow
                label="Цель"
                value={examGoalLabel(summary, app)}
              />
            </div>

            <div className="rounded-[10px] bg-white px-4 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
              <h4 className="dashboard-v2-title mb-3">Состояние заявки</h4>
              <InfoRow label="Заявка" value={statusText(currentApp.status)} />
              <InfoRow label="Дата подачи" value={applicationDateLabel(currentApp.status, currentApp.submittedAt)} />
              <InfoRow label="Решение" value={reviewDateLabel(currentApp.status, currentApp.reviewedAt)} />
              <InfoRow label="Проверил" value={currentApp.reviewedByEmail || '-'} />

              {currentApp.comment ? (
                <div className="dashboard-v2-caption mt-3 rounded-[8px] bg-[#FFF5F6] px-3 py-2 text-[var(--color-danger)]">
                  {currentApp.comment}
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-5">
            {details.isLoading ? (
              <p className="dashboard-v2-text text-[#6B7894]">Загрузка сводки...</p>
            ) : details.error || !summary ? (
              <p className="dashboard-v2-text text-[var(--color-danger)]">Не удалось загрузить сводку.</p>
            ) : (
              <>
                <div className="rounded-[10px] bg-white px-4 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
                  <h4 className="dashboard-v2-title mb-3">Готовность к экзамену</h4>
                  <CheckLine ok={summary.ceu.ready} label="CEU-баллы">
                    {formatNumber(summary.ceu.current.total)} / {formatNumber(summary.ceu.required?.total)}
                  </CheckLine>
                  <CheckLine ok={summary.supervision.ready} label="Часы">
                    {summary.supervision.required?.supervisor
                      ? `${formatNumber(capToRequired(summary.supervision.current.mentor, summary.supervision.required.supervisor))} / ${formatNumber(summary.supervision.required.supervisor)} менторство`
                      : `${formatNumber(capToRequired(summary.supervision.current.practice, summary.supervision.required?.practice))} / ${formatNumber(summary.supervision.required?.practice)} практика, ${formatNumber(capToRequired(summary.supervision.current.supervision, summary.supervision.required?.supervision))} / ${formatNumber(summary.supervision.required?.supervision)} супервизия`}
                  </CheckLine>
                  <CheckLine ok={summary.documents.ready} label="Документы">
                    {summary.documents.request ? (
                      <a
                        href={summary.documents.request.adminUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="cursor-pointer underline underline-offset-2"
                      >
                        Открыть проверку документов
                      </a>
                    ) : (
                      'заявка не найдена'
                    )}
                  </CheckLine>
                  <CheckLine ok={summary.payments.ready} label="Оплаты">
                    {summary.payments.ready ? 'все платежи оплачены' : 'есть неоплаченные платежи'}
                  </CheckLine>
                </div>

                <div className="rounded-[10px] bg-[var(--color-blue-soft)] px-4 py-4">
                  <h4 className="dashboard-v2-title mb-3">Оплаты</h4>
                  <div className="divide-y divide-[#D4E2E6]">
                    {summary.payments.items.map((payment) => (
                      <PaymentLine
                        key={payment.type}
                        ok={payment.paid}
                        label={payment.label}
                        requestedAt={payment.requestedAt}
                        confirmedAt={payment.confirmedAt}
                      />
                    ))}
                  </div>
                </div>

                <div
                  className={`dashboard-v2-label rounded-[10px] px-4 py-3 text-center ${
                    summary.ready
                      ? 'bg-[var(--color-green-brand)] text-white'
                      : 'bg-[#FFF5F6] text-[var(--color-danger)]'
                  }`}
                >
                  {summary.ready
                    ? 'Все готово, можно проводить экзамен'
                    : `Не готово: ${summary.missing.join(', ')}`}
                </div>
              </>
            )}
          </section>
        </div>

        <label className="mt-5 block">
          <span className="dashboard-v2-small mb-1 block text-[#1F305E]">
            Комментарий для пользователя
          </span>
          <textarea
            className="input-design min-h-[90px] resize-y"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={COMMENT_MAX_LENGTH}
            placeholder="Причина отклонения или служебный комментарий"
            disabled={disabled}
          />
        </label>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          {currentApp.status === 'PENDING' ? (
            <button
              type="button"
              onClick={() => doChange('APPROVED')}
              disabled={disabled}
              className="btn btn-dark dashboard-v2-label h-[42px] min-w-[140px] rounded-full px-6 disabled:bg-[#B7BFCE]"
            >
              Одобрить
            </button>
          ) : null}

          {currentApp.status !== 'REJECTED' ? (
            <button
              type="button"
              onClick={() => doChange('REJECTED')}
              disabled={disabled}
              className="btn dashboard-v2-label h-[42px] min-w-[140px] rounded-full border-2 border-[var(--color-danger)] px-6 text-[var(--color-danger)] disabled:opacity-50"
            >
              Отклонить
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-v2-caption mb-2 grid grid-cols-[130px_minmax(0,1fr)] gap-3 text-[#1F305E]">
      <span className="text-[#8D96B5]">{label}</span>
      <span className="min-w-0 break-words font-extrabold">{value}</span>
    </div>
  );
}

function CheckLine({
  ok,
  label,
  children,
}: {
  ok: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="dashboard-v2-caption mb-2 flex min-w-0 items-start gap-2 text-[#1F305E]">
      {ok ? (
        <CheckCircle size={16} className="mt-[2px] shrink-0 text-[var(--color-green-brand)]" />
      ) : (
        <XCircle size={16} className="mt-[2px] shrink-0 text-[var(--color-danger)]" />
      )}
      <span className="font-extrabold">{label}:</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

function PaymentLine({
  ok,
  label,
  requestedAt,
  confirmedAt,
}: {
  ok: boolean;
  label: string;
  requestedAt?: string | null;
  confirmedAt?: string | null;
}) {
  return (
    <div className="dashboard-v2-caption grid grid-cols-1 items-start gap-2 py-2 text-[#1F305E] first:pt-0 last:pb-0 sm:grid-cols-[minmax(180px,1fr)_minmax(210px,auto)] sm:gap-4">
      <div className="flex min-w-0 items-start gap-2">
        {ok ? (
          <CheckCircle size={16} className="mt-[2px] shrink-0 text-[var(--color-green-brand)]" />
        ) : (
          <XCircle size={16} className="mt-[2px] shrink-0 text-[var(--color-danger)]" />
        )}
        <span className="min-w-0 font-extrabold">{label}:</span>
      </div>

      <div className="grid grid-cols-[105px_minmax(0,1fr)] gap-x-2 text-left sm:min-w-[210px]">
        <span className="text-[#8D96B5]">Заявлено:</span>
        <span>{requestedAt ? formatDate(requestedAt) : 'нет'}</span>
        <span className="text-[#8D96B5]">Подтверждено:</span>
        <span>{confirmedAt ? formatDate(confirmedAt) : 'нет'}</span>
      </div>
    </div>
  );
}
