import { ModalCloseButton } from '@/components/ModalCloseButton';
import { ModalShell } from '@/components/ModalShell';
import type { AdminReviewerCandidateRow } from '@/features/admin/api/supervision/getAdminReviewerCandidates';
import { getSupervisionRequestDateLabel } from '@/features/supervision/utils/requestDateLabels';
import {
  formatDateRu as formatDate,
  formatDateTimeRu as formatDateTime,
} from '@/utils/dateFormat';

const HOUR_LABELS: Record<string, string> = {
  INSTRUCTOR: 'Практика',
  CURATOR: 'Практика',
  PRACTICE: 'Практика',
  IMPLEMENTING: 'Полевая практика',
  PROGRAMMING: 'Работа с информацией',
  SUPERVISOR: 'Менторские часы',
  SUPERVISION: 'Менторские часы',
};

function formatNumber(value?: number | null) {
  if (value == null) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function CompactField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="dashboard-v2-small mb-1 text-[#8D96B5]">{label}</div>
      <div className="dashboard-v2-caption min-h-[32px] rounded-[8px] bg-[#F3F6F8] px-3 py-2 text-[#1F305E]">
        {value}
      </div>
    </div>
  );
}

function HoursList({ hours }: { hours: AdminReviewerCandidateRow['pendingRequests'][number]['hours'] }) {
  const total = hours.reduce((sum, hour) => sum + Number(hour.value || 0), 0);

  return (
    <div className="rounded-[10px] bg-white px-3 py-2">
      {hours.map((hour) => (
        <div
          key={hour.id}
          className="flex items-center justify-between gap-4 border-b border-[#DCE8EC] py-2 last:border-b-0"
        >
          <span>{HOUR_LABELS[hour.type] ?? hour.type}</span>
          <span className="font-extrabold">{formatNumber(hour.value)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-4 pt-2 font-extrabold">
        <span>Всего</span>
        <span>{formatNumber(total)}</span>
      </div>
    </div>
  );
}

function DistributionBlock({
  distribution,
}: {
  distribution: AdminReviewerCandidateRow['pendingRequests'][number]['distribution'];
}) {
  const direct = distribution.directIndividual + distribution.directGroup;
  const nonObserving = distribution.nonObservingIndividual + distribution.nonObservingGroup;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-[10px] bg-white px-3 py-2">
        <MiniRow label="С наблюдением" value={direct} strong />
        <MiniRow label="Индивидуально" value={distribution.directIndividual} />
        <MiniRow label="В группе" value={distribution.directGroup} />
      </div>
      <div className="rounded-[10px] bg-white px-3 py-2">
        <MiniRow label="Без наблюдения" value={nonObserving} strong />
        <MiniRow label="Индивидуально" value={distribution.nonObservingIndividual} />
        <MiniRow label="В группе" value={distribution.nonObservingGroup} />
      </div>
    </div>
  );
}

function MiniRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#DCE8EC] py-1.5 last:border-b-0">
      <span>{label}</span>
      <span className={strong ? 'font-extrabold' : 'font-semibold'}>{formatNumber(value)}</span>
    </div>
  );
}

export function AdminCorrectionDetailsModal({
  row,
  kindLabel,
  candidateDisplayName,
  onClose,
}: {
  row: AdminReviewerCandidateRow;
  kindLabel: string;
  candidateDisplayName: string;
  onClose: () => void;
}) {
  const correction = row.adminCorrection;
  const admin = correction?.admin?.fullName || correction?.admin?.email || row.reviewer.email || '—';
  const distribution = correction?.distribution ?? {
    directIndividual: 0,
    directGroup: 0,
    nonObservingIndividual: 0,
    nonObservingGroup: 0,
  };
  const practiceTotal = round2((correction?.implementing ?? 0) + (correction?.programming ?? 0));
  const supervisionTotal = round2(
    distribution.directIndividual +
      distribution.directGroup +
      distribution.nonObservingIndividual +
      distribution.nonObservingGroup,
  );

  return (
    <ModalShell
      onClose={onClose}
      closeOnBackdrop={false}
      ariaLabel="Корректировка администратора"
      dialogClassName="relative max-h-[90vh] w-full max-w-[900px] overflow-y-auto rounded-[16px] bg-white px-6 py-6 text-[#1F305E] shadow-[0_12px_32px_rgba(0,0,0,0.24)]"
    >
        <ModalCloseButton onClick={onClose} />

        <h3 className="dashboard-v2-page-title mb-5 text-center">Корректировка администратора</h3>

        <div className="mb-5 grid gap-4 md:grid-cols-3">
          <CompactField label="Дата корректировки" value={formatDateTime(correction?.updatedAt)} />
          <CompactField label="Кто сделал" value={admin} />
          <CompactField label="Кому сделал" value={candidateDisplayName} />
          <CompactField label="Email кандидата" value={row.candidate.email} />
          <CompactField label="Тип" value={kindLabel} />
          <CompactField
            label="Уведомление"
            value={correction?.notifyUser ? 'Отправлено пользователю' : 'Без уведомления'}
          />
        </div>

        <section className="rounded-[14px] bg-[var(--color-blue-soft)] px-4 py-4 dashboard-v2-text">
          <h4 className="dashboard-v2-title mb-3">Что изменено</h4>

          {row.kind === 'mentorship' ? (
            <div className="rounded-[10px] bg-white px-3 py-2">
              <MiniRow label="Итоговые часы менторства" value={correction?.mentor ?? 0} strong />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="space-y-4">
                <div className="rounded-[10px] bg-white px-3 py-2">
                  <MiniRow label="Полевая практика" value={correction?.implementing ?? 0} />
                  <MiniRow label="Работа с информацией" value={correction?.programming ?? 0} />
                  <MiniRow label="Итоговая практика" value={practiceTotal} strong />
                </div>
              </div>

              <div className="space-y-4">
                <DistributionBlock distribution={distribution} />
                <div className="rounded-[10px] bg-white px-3 py-2">
                  <MiniRow label="Итоговая супервизия" value={supervisionTotal} strong />
                </div>
              </div>
            </div>
          )}
        </section>
    </ModalShell>
  );
}

export function LegacyHoursDetailsModal({
  row,
  kindLabel,
  candidateDisplayName,
  onClose,
}: {
  row: AdminReviewerCandidateRow;
  kindLabel: string;
  candidateDisplayName: string;
  onClose: () => void;
}) {
  const record = row.legacyRecord;
  const requestDateLabel = getSupervisionRequestDateLabel(row.kind);
  const distribution = record?.distribution ?? {
    directIndividual: 0,
    directGroup: 0,
    nonObservingIndividual: 0,
    nonObservingGroup: 0,
  };

  return (
    <ModalShell
      onClose={onClose}
      closeOnBackdrop={false}
      ariaLabel="Часы из старой версии"
      dialogClassName="relative max-h-[90vh] w-full max-w-[900px] overflow-y-auto rounded-[16px] bg-white px-6 py-6 text-[#1F305E] shadow-[0_12px_32px_rgba(0,0,0,0.24)]"
    >
        <ModalCloseButton onClick={onClose} />

        <h3 className="dashboard-v2-page-title mb-5 text-center">Часы из старой версии</h3>

        <div className="mb-5 grid gap-4 md:grid-cols-3">
          <CompactField label="Кандидат" value={candidateDisplayName} />
          <CompactField label="Email кандидата" value={row.candidate.email} />
          <CompactField label="Тип" value={kindLabel} />
          <CompactField label={requestDateLabel} value={formatDate(record?.supervisionDate ?? record?.createdAt)} />
          <CompactField label="Период практики" value={`${formatDate(record?.periodStartedAt)} — ${formatDate(record?.periodEndedAt)}`} />
          <CompactField label="Источник" value="из старой версии" />
        </div>

        <section className="rounded-[14px] bg-[var(--color-blue-soft)] px-4 py-4 dashboard-v2-text">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="space-y-4">
              <HoursList hours={record?.hours ?? []} />
              {row.kind === 'supervision' ? (
                <DistributionBlock distribution={distribution} />
              ) : null}
            </div>

            <div className="space-y-3">
              <CompactField label="Условия практики" value={record?.treatmentSetting || '—'} />
              <div>
                <div className="dashboard-v2-small mb-1 text-[#8D96B5]">Описание</div>
                <div className="dashboard-v2-caption min-h-[76px] rounded-[8px] bg-white px-3 py-2 text-[#1F305E]">
                  {record?.description || '—'}
                </div>
              </div>
            </div>
          </div>
        </section>
    </ModalShell>
  );
}

export function AdminPendingHoursDetailsModal({
  row,
  kindLabel,
  candidateDisplayName,
  stateText,
  isPending,
  onClose,
  onRemove,
}: {
  row: AdminReviewerCandidateRow;
  kindLabel: string;
  candidateDisplayName: string;
  stateText: string;
  isPending: boolean;
  onClose: () => void;
  onRemove: () => void;
}) {
  const pendingRequests = row.pendingRequests ?? [];
  const hasPendingRequests = pendingRequests.length > 0;
  const requestDateLabel = getSupervisionRequestDateLabel(row.kind);

  return (
    <ModalShell
      onClose={onClose}
      closeOnBackdrop={false}
      ariaLabel="Детали заявки на подтверждение часов"
      dialogClassName="relative max-h-[90vh] w-full max-w-[900px] overflow-y-auto rounded-[16px] bg-white px-6 py-6 text-[#1F305E] shadow-[0_12px_32px_rgba(0,0,0,0.24)]"
    >
        <ModalCloseButton onClick={onClose} />

        <h3 className="dashboard-v2-page-title mb-5 text-center">Детали заявки на подтверждение часов</h3>

        <div className="mb-5 grid gap-4 md:grid-cols-3">
          <CompactField label="Кандидат" value={candidateDisplayName} />
          <CompactField label="Email кандидата" value={row.candidate.email} />
          <CompactField label="Назначенный проверяющий" value={row.reviewer.email} />
          <CompactField label="Тип" value={kindLabel} />
          <CompactField label={requestDateLabel} value={formatDate(row.latestPendingRequestAt ?? row.latestRequestAt)} />
          <CompactField label="Состояние" value={stateText} />
        </div>

        {hasPendingRequests ? (
          <div className="space-y-4">
            {pendingRequests.map((request, index) => (
              <section
                key={request.id}
                className="rounded-[14px] bg-[var(--color-blue-soft)] px-4 py-4 dashboard-v2-text"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="dashboard-v2-title">
                    {pendingRequests.length > 1 ? `Заявка ${index + 1}` : 'Заявка'}
                  </h4>
                  <span className="dashboard-v2-caption text-[#8D96B5]">
                    {requestDateLabel}: {formatDate(request.supervisionDate ?? request.createdAt)}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                  <div className="space-y-4">
                    <HoursList hours={request.hours} />
                    {row.kind === 'supervision' ? (
                      <DistributionBlock distribution={request.distribution} />
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CompactField
                        label="Дата начала периода практики"
                        value={formatDate(request.periodStartedAt)}
                      />
                      <CompactField
                        label="Дата окончания периода практики"
                        value={formatDate(request.periodEndedAt)}
                      />
                    </div>
                    <CompactField label="Условия практики" value={request.treatmentSetting || '—'} />
                    <div>
                      <div className="dashboard-v2-small mb-1 text-[#8D96B5]">Описание</div>
                      <div className="dashboard-v2-caption min-h-[76px] rounded-[8px] bg-white px-3 py-2 text-[#1F305E]">
                        {request.description || '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="dashboard-v2-text rounded-[12px] bg-[var(--color-blue-soft)] px-4 py-5 text-[#6B7894]">
            Сейчас нет часов, ожидающих проверки.
          </div>
        )}

        {hasPendingRequests ? (
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onRemove}
              disabled={isPending}
              className="btn dashboard-v2-action dashboard-v2-action-secondary border-[var(--color-danger)] text-[var(--color-danger)] disabled:opacity-50"
            >
              Убрать из проверки
            </button>
          </div>
        ) : null}
    </ModalShell>
  );
}
