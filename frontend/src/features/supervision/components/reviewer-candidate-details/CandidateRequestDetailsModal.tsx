import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useUpdateHourStatus } from '../../hooks/useUpdateHourStatus';
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
  CONFIRMED: 'Заявка принята',
  REJECTED: 'Заявка отклонена',
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
      <div className="mb-1 text-[12px] font-semibold text-[#1F305E]">{label}</div>
      <div className="min-h-[30px] rounded-[8px] bg-[#EFF1F5] px-3 py-1.5 text-[13px] text-[#1F305E]">
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
  const mutation = useUpdateHourStatus();
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectedReason, setRejectedReason] = useState('');

  const isPending = !!request.actionHourId;

  const accept = async () => {
    if (!request.actionHourId) return;

    try {
      await mutation.mutateAsync({ id: request.actionHourId, status: 'CONFIRMED' });
      toast.success('Заявка принята');
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось принять заявку');
    }
  };

  const reject = async () => {
    if (!request.actionHourId) return;

    const trimmed = rejectedReason.trim();
    if (!trimmed) {
      toast.error('Укажите причину отклонения');
      return;
    }

    try {
      await mutation.mutateAsync({
        id: request.actionHourId,
        status: 'REJECTED',
        rejectedReason: trimmed,
      });
      toast.success('Заявка отклонена');
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Не удалось отклонить заявку');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="relative max-h-[90vh] w-full max-w-[920px] overflow-y-auto rounded-[16px] bg-white px-6 py-6 shadow-[0_12px_32px_rgba(0,0,0,0.24)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-4 cursor-pointer text-[34px] leading-none text-[#A7B1C7]"
          aria-label="Закрыть"
        >
          ×
        </button>

        <h3 className="mb-5 text-center text-[22px] font-extrabold text-[#1F305E]">
          Детали заявки
        </h3>

        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <ReadOnlyField label="Дата заявки" value={formatDate(request.createdAt)} />
          <ReadOnlyField
            label="Тип заявки"
            value={kind === 'mentorship' ? 'Менторство' : 'Супервизия'}
          />
          <ReadOnlyField label="Статус" value={STATUS_LABELS[request.status]} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-5">
            <section className="rounded-[12px] bg-[#E5EFF1] px-4 py-4 text-[14px] text-[#1F305E]">
              <h4 className="mb-3 text-[16px] font-extrabold">Часы</h4>
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
              <section className="rounded-[12px] bg-[#F7F8FA] px-4 py-4 text-[14px] text-[#1F305E]">
                <h4 className="mb-3 text-[16px] font-extrabold">Распределение супервизии</h4>
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
              <ReadOnlyField label="Дата начала" value={formatDate(request.periodStartedAt)} />
              <ReadOnlyField label="Дата окончания" value={formatDate(request.periodEndedAt)} />
            </div>

            <ReadOnlyField label="Условия практики" value={request.treatmentSetting || '—'} />

            <div>
              <div className="mb-1 text-[12px] font-semibold text-[#1F305E]">Описание</div>
              <div className="min-h-[120px] rounded-[8px] bg-[#EFF1F5] px-3 py-2 text-[13px] leading-relaxed text-[#1F305E]">
                {request.description || '—'}
              </div>
            </div>

            {request.rejectedReason ? (
              <div className="rounded-[10px] bg-[#FFFFFF] px-4 py-3 text-[14px] text-[#FF5364]">
                {request.rejectedReason}
              </div>
            ) : null}

            {rejectMode ? (
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-[#1F305E]">
                  Причина отклонения
                </span>
                <textarea
                  className="input-design min-h-[90px] resize-y"
                  value={rejectedReason}
                  onChange={(event) => setRejectedReason(event.target.value)}
                  placeholder="Кратко укажите причину"
                />
              </label>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          {isPending ? (
            <>
              <button
                type="button"
                onClick={accept}
                disabled={mutation.isPending}
                className="btn btn-dark h-[42px] min-w-[140px] rounded-full px-6 text-[15px] font-extrabold disabled:bg-[#B7BFCE]"
              >
                Подтвердить
              </button>
              {rejectMode ? (
                <button
                  type="button"
                  onClick={reject}
                  disabled={mutation.isPending}
                  className="btn h-[42px] min-w-[150px] rounded-full border-2 border-[#1F305E] px-6 text-[15px] font-extrabold text-[#1F305E] disabled:opacity-50"
                >
                  Отправить отказ
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setRejectMode(true)}
                  disabled={mutation.isPending}
                  className="btn h-[42px] min-w-[140px] rounded-full border-2 border-[#1F305E] px-6 text-[15px] font-extrabold text-[#1F305E] disabled:opacity-50"
                >
                  Отклонить
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="btn btn-dark h-[42px] min-w-[120px] rounded-full px-6 text-[15px] font-extrabold"
            >
              Закрыть
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
