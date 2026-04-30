import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useSupervisionRecordHistory } from '../hooks/useSupervisionRecordHistory';
import type { SupervisionRecordHistoryItem } from '../api/getSupervisionRecordHistory';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return format(new Date(value), 'dd.MM.yyyy');
}

function formatNumber(value: number | null | undefined) {
  if (value == null) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function statusLabel(record: SupervisionRecordHistoryItem) {
  const supervisorName = record.supervisor?.fullName || record.supervisor?.email || '';

  if (record.status === 'CONFIRMED') {
    return supervisorName ? `Принято супервизором ${supervisorName}` : 'Принято супервизором';
  }

  if (record.status === 'REJECTED') {
    return 'Отклонено';
  }

  if (record.status === 'SPENT') {
    return 'Использовано';
  }

  if (record.status === 'MIXED') {
    return 'Частично обработано';
  }

  return 'На рассмотрении';
}

export function SupervisionRecordHistoryBlock() {
  const [selectedRecord, setSelectedRecord] = useState<SupervisionRecordHistoryItem | null>(null);
  const {
    data,
    status,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSupervisionRecordHistory({ take: 25 });

  const records = useMemo(
    () => (data ? data.pages.flatMap((page) => page.records) : []),
    [data],
  );

  return (
    <section
      id="supervision-history"
      className="mt-5 scroll-mt-5 rounded-[16px] bg-white px-5 py-5 shadow-[0_2px_12px_rgba(0,0,0,0.10)]"
    >
      <h2 className="mb-5 text-center text-[18px] font-extrabold text-[#1F305E]">История</h2>

      {status === 'pending' ? (
        <p className="text-[14px] text-[#6B7894]">Загрузка истории...</p>
      ) : records.length === 0 ? (
        <p className="text-[14px] text-[#6B7894]">Пока нет заявок.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-[14px] text-[#1F305E]">
            <thead>
              <tr className="bg-[#E7F1F4] text-left">
                <th className="rounded-l-[10px] px-4 py-3 font-medium">Начало</th>
                <th className="px-4 py-3 font-medium">Окончание</th>
                <th className="px-4 py-3 text-center font-medium">Полевая практика</th>
                <th className="px-4 py-3 text-center font-medium">Работа с информацией</th>
                <th className="px-4 py-3 text-center font-medium">С наблюдением</th>
                <th className="px-4 py-3 text-center font-medium">Без наблюдения</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="rounded-r-[10px] px-4 py-3 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-[#DCE8EC] last:border-b-0">
                  <td className="px-4 py-4">{formatDate(record.periodStartedAt)}</td>
                  <td className="px-4 py-4">{formatDate(record.periodEndedAt)}</td>
                  <td className="px-4 py-4 text-center text-[#6B7894]">
                    {formatNumber(record.hours.implementing)}
                  </td>
                  <td className="px-4 py-4 text-center font-extrabold">
                    {formatNumber(record.hours.programming)}
                  </td>
                  <td className="px-4 py-4 text-center text-[#6B7894]">
                    {formatNumber(record.distribution.direct)}
                  </td>
                  <td className="px-4 py-4 text-center font-extrabold">
                    {formatNumber(record.distribution.nonObserving)}
                  </td>
                  <td className="px-4 py-4 text-[#6B7894]">{statusLabel(record)}</td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(record)}
                      className="btn btn-dark h-[34px] rounded-full px-5 text-[14px] font-extrabold"
                    >
                      Детали
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasNextPage ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="btn h-[40px] rounded-[10px] border border-[#1F305E] px-5 text-[14px] font-semibold text-[#1F305E]"
          >
            {isFetchingNextPage ? 'Загрузка...' : 'Показать еще'}
          </button>
        </div>
      ) : null}

      {selectedRecord ? (
        <SupervisionRecordDetailsModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      ) : null}
    </section>
  );
}

function SupervisionRecordDetailsModal({
  record,
  onClose,
}: {
  record: SupervisionRecordHistoryItem;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="relative max-h-[90vh] w-full max-w-[980px] overflow-y-auto rounded-[12px] bg-white px-6 py-5 shadow-[0_12px_32px_rgba(0,0,0,0.24)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-[28px] leading-none text-[#A7B1C7]"
          aria-label="Закрыть"
        >
          ×
        </button>

        <h3 className="mb-5 text-center text-[18px] font-extrabold text-[#1F305E]">
          Детали заявки
        </h3>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Дата подачи заявки" value={formatDate(record.createdAt)} />
            <ReadOnlyField label="Условия практики" value={record.treatmentSetting || '—'} />
            <ReadOnlyField label="Дата начала" value={formatDate(record.periodStartedAt)} />
            <ReadOnlyField label="Дата окончания" value={formatDate(record.periodEndedAt)} />
            </div>

            <div>
              <h4 className="mb-3 text-[14px] font-extrabold text-[#1F305E]">Практика</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <ReadOnlyField
                  label="Полевая практика"
                  value={formatNumber(record.hours.implementing)}
                />
                <ReadOnlyField
                  label="Работа с информацией"
                  value={formatNumber(record.hours.programming)}
                />
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-[14px] font-extrabold text-[#1F305E]">Супервизия</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-4 sm:border-r sm:border-[#DCE3EF] sm:pr-4">
                  <ReadOnlyField
                    label="С наблюдением"
                    value={formatNumber(record.distribution.direct)}
                  />
                  <ReadOnlyField
                    label="Индивидуально"
                    value={formatNumber(record.distribution.directIndividual)}
                  />
                  <ReadOnlyField
                    label="В группе"
                    value={formatNumber(record.distribution.directGroup)}
                  />
                </div>

                <div className="space-y-4">
                  <ReadOnlyField
                    label="Без наблюдения"
                    value={formatNumber(record.distribution.nonObserving)}
                  />
                  <ReadOnlyField
                    label="Индивидуально"
                    value={formatNumber(record.distribution.nonObservingIndividual)}
                  />
                  <ReadOnlyField
                    label="В группе"
                    value={formatNumber(record.distribution.nonObservingGroup)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <ReadOnlyField
              label="Супервизор"
              value={record.supervisor?.fullName || record.supervisor?.email || '—'}
            />

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <ReadOnlyField label="Кандидат" value={record.user.fullName || '—'} />
              <ReadOnlyField label="Email" value={record.user.email || '—'} />
            </div>

            <div className="mt-4 rounded-[10px] bg-[#C8CEDB] px-4 py-3 text-center text-[14px] font-semibold text-[#1F305E]">
              {statusLabel(record)}
            </div>

            {record.rejectedReason ? (
              <div className="mt-3 rounded-[10px] bg-[#FFF0F2] px-4 py-3 text-[14px] text-[#FF5365]">
                {record.rejectedReason}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 text-[13px] font-semibold text-[#1F305E]">Описание</div>
          <div className="min-h-[136px] rounded-[10px] border border-[#B8C4D8] bg-white px-3 py-2 text-[13px] leading-relaxed text-[#1F305E]">
            {record.description || '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <div className="mb-1 text-[12px] font-semibold text-[#1F305E]">{label}</div>
      <div className="min-h-[28px] rounded-[8px] bg-[#EFF1F5] px-3 py-1.5 text-[13px] text-[#1F305E]">
        {value}
      </div>
    </div>
  );
}
