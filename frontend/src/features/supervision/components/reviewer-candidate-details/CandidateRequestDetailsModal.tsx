import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useUpdateHourStatus } from '../../hooks/useUpdateHourStatus';
import { COMMENT_MAX_LENGTH } from '@/utils/formLimits';
import { UI_TOAST_MESSAGES } from '@/utils/uiMessages';
import { ModalCloseButton } from '@/components/ModalCloseButton';
import { useConfirm } from '@/components/confirm/ConfirmProvider';
import { getSupervisionRequestDateLabel } from '../../utils/requestDateLabels';
import type {
  ReviewerCandidateKind,
  ReviewerCandidateRequest,
} from '../../api/getReviewerCandidateDetails';

type CandidateRequestDetailsModalProps = {
  kind: ReviewerCandidateKind;
  request: ReviewerCandidateRequest;
  onClose: () => void;
};

const STATUS_LABELS: Record<ReviewerCandidateRequest['status'], string> = {
  UNCONFIRMED: 'На рассмотрении',
  CONFIRMED: 'Часы подтверждены',
  REJECTED: 'Часы отклонены',
  SPENT: 'Использовано',
};

const HOUR_LABELS: Record<string, string> = {
  INSTRUCTOR: 'Практика',
  CURATOR: 'Практика',
  PRACTICE: 'Практика',
  IMPLEMENTING: 'Полевая практика',
  PROGRAMMING: 'Работа с информацией',
  SUPERVISOR: 'Менторские часы',
  SUPERVISION: 'Менторские часы',
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return format(new Date(value), 'dd.MM.yyyy');
}

function formatNumber(value: number | null | undefined) {
  if (value == null) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="dashboard-v2-small mb-1 text-[#1F305E]">{label}</div>
      <div className="dashboard-v2-caption min-h-[30px] rounded-[8px] bg-[var(--color-blue-soft)] px-3 py-1.5 text-[#1F305E]">
        {value}
      </div>
    </div>
  );
}

function HourRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-[#DCE8EC] py-2 last:border-b-0">
      <span>{label}</span>
      <span className="font-extrabold">{formatNumber(value)}</span>
    </div>
  );
}

export function CandidateRequestDetailsModal({
  kind,
  request,
  onClose,
}: CandidateRequestDetailsModalProps) {
  const requestDateLabel = getSupervisionRequestDateLabel(kind);
  const mutation = useUpdateHourStatus();
  const { confirm } = useConfirm();
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectedReason, setRejectedReason] = useState('');

  const isPending = !!request.actionHourId;
  const reviewer = request.hours.find((hour) => hour.reviewer)?.reviewer ?? null;
  const reviewedBy = request.hours.find((hour) => hour.reviewedBy)?.reviewedBy ?? null;
  const adminReviewNote =
    reviewedBy && (!reviewer || reviewedBy.id !== reviewer.id) && request.status !== 'UNCONFIRMED'
      ? `${request.status === 'REJECTED' ? 'Отклонено' : 'Подтверждено'} админом: ${reviewedBy.email}`
      : null;

  const accept = async () => {
    if (!request.actionHourId) return;

    const ok = await confirm({
      message: 'Подтвердить часы?',
      description: 'После подтверждения статус заявки нельзя будет изменить.',
      confirmLabel: 'Подтвердить',
    });
    if (!ok) return;

    try {
      await mutation.mutateAsync({ id: request.actionHourId, status: 'CONFIRMED' });
      toast.success(UI_TOAST_MESSAGES.supervision.confirmed);
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || UI_TOAST_MESSAGES.supervision.confirmFailed);
    }
  };

  const reject = async () => {
    if (!request.actionHourId) return;

    const trimmed = rejectedReason.trim();
    if (!trimmed) {
      toast.error(UI_TOAST_MESSAGES.supervision.reviewReasonRequired);
      return;
    }

    const ok = await confirm({
      message: 'Отклонить часы?',
      description: 'После отклонения статус заявки нельзя будет изменить.',
      confirmLabel: 'Отклонить',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await mutation.mutateAsync({
        id: request.actionHourId,
        status: 'REJECTED',
        rejectedReason: trimmed,
      });
      toast.success(UI_TOAST_MESSAGES.supervision.rejected);
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || UI_TOAST_MESSAGES.supervision.rejectFailed);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="relative max-h-[90vh] w-full max-w-[920px] overflow-y-auto rounded-[16px] bg-white px-6 py-6 shadow-[0_12px_32px_rgba(0,0,0,0.24)]">
        <ModalCloseButton onClick={onClose} />

        <h3 className="dashboard-v2-page-title mb-5 text-center text-[#1F305E]">
          Детали заявки на подтверждение часов
        </h3>

        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <ReadOnlyField
            label={requestDateLabel}
            value={formatDate(request.supervisionDate ?? request.createdAt)}
          />
          <ReadOnlyField
            label="Тип часов"
            value={kind === 'mentorship' ? 'Менторство' : 'Супервизия'}
          />
          <ReadOnlyField label="Статус" value={STATUS_LABELS[request.status]} />
        </div>

        {adminReviewNote ? (
          <div className="dashboard-v2-caption mb-5 rounded-[10px] bg-[var(--color-blue-soft)] px-4 py-3 text-[#1F305E]">
            {adminReviewNote}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-5">
            <section className="dashboard-v2-text rounded-[12px] bg-[var(--color-blue-soft)] px-4 py-4 text-[#1F305E]">
              <h4 className="dashboard-v2-title mb-3">Часы</h4>
              {request.hours.length > 0 ? (
                <div className="rounded-[10px] bg-white px-3 py-2">
                  {request.hours.map((hour) => (
                    <HourRow
                      key={hour.id}
                      label={HOUR_LABELS[hour.type] ?? hour.type}
                      value={hour.value}
                    />
                  ))}
                  <HourRow label="Всего" value={request.totals.total} />
                </div>
              ) : (
                <p className="text-[#6B7894]">Часы не указаны.</p>
              )}
            </section>

            {kind === 'supervision' ? (
              <section className="dashboard-v2-text rounded-[12px] bg-[var(--color-blue-soft)] px-4 py-4 text-[#1F305E]">
                <h4 className="dashboard-v2-title mb-3">Распределение супервизии</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[10px] bg-white px-3 py-2">
                    <HourRow label="С наблюдением" value={request.distribution.direct} />
                    <HourRow
                      label="Индивидуально"
                      value={request.distribution.directIndividual}
                    />
                    <HourRow label="В группе" value={request.distribution.directGroup} />
                  </div>
                  <div className="rounded-[10px] bg-white px-3 py-2">
                    <HourRow label="Без наблюдения" value={request.distribution.nonObserving} />
                    <HourRow
                      label="Индивидуально"
                      value={request.distribution.nonObservingIndividual}
                    />
                    <HourRow label="В группе" value={request.distribution.nonObservingGroup} />
                  </div>
                </div>
              </section>
            ) : null}
          </div>

          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyField
                label="Дата начала периода практики"
                value={formatDate(request.periodStartedAt)}
              />
              <ReadOnlyField
                label="Дата окончания периода практики"
                value={formatDate(request.periodEndedAt)}
              />
            </div>

            <ReadOnlyField label="Условия практики" value={request.treatmentSetting || '—'} />

            <div>
              <div className="dashboard-v2-small mb-1 text-[#1F305E]">Описание</div>
              <div className="dashboard-v2-caption min-h-[120px] rounded-[8px] bg-[var(--color-blue-soft)] px-3 py-2 text-[#1F305E]">
                {request.description || '—'}
              </div>
            </div>

            {request.rejectedReason ? (
              <div className="dashboard-v2-text rounded-[10px] bg-white px-4 py-3 text-[var(--color-danger)]">
                {request.rejectedReason}
              </div>
            ) : null}

            {rejectMode ? (
              <label className="block">
                <span className="dashboard-v2-small mb-1 block text-[#1F305E]">
                  Причина отклонения
                </span>
                <textarea
                  className="input-design min-h-[90px] resize-y"
                  value={rejectedReason}
                  onChange={(event) => setRejectedReason(event.target.value)}
                  maxLength={COMMENT_MAX_LENGTH}
                  placeholder="Кратко укажите причину"
                />
              </label>
            ) : null}
          </div>
        </div>

        {isPending ? (
          <div className="mt-6 flex justify-end gap-3">
            <>
              <button
                type="button"
                onClick={accept}
                disabled={mutation.isPending}
                className="btn btn-dark dashboard-v2-label h-[42px] min-w-[140px] rounded-full px-6 disabled:bg-[#B7BFCE]"
              >
                Подтвердить
              </button>
              {rejectMode ? (
                <button
                  type="button"
                  onClick={reject}
                  disabled={mutation.isPending}
                  className="btn dashboard-v2-label h-[42px] min-w-[150px] rounded-full border-2 border-[#1F305E] px-6 text-[#1F305E] disabled:opacity-50"
                >
                  Отправить отказ
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setRejectMode(true)}
                  disabled={mutation.isPending}
                  className="btn dashboard-v2-label h-[42px] min-w-[140px] rounded-full border-2 border-[#1F305E] px-6 text-[#1F305E] disabled:opacity-50"
                >
                  Отклонить
                </button>
              )}
            </>
          </div>
        ) : null}
      </div>
    </div>
  );
}
