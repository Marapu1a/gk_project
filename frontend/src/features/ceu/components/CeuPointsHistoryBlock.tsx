import { useState } from 'react';
import { useCeuHistory } from '../hooks/useCeuHistory';
import type { CeuHistoryItem, CeuHistoryPeriod } from '../api/getCeuHistory';
import { displayCeuEventName } from '../utils/displayCeuEventName';
import { ModalCloseButton } from '@/components/ModalCloseButton';
import { ModalShell } from '@/components/ModalShell';
import { StatusPill, type StatusPillTone } from '@/components/StatusPill';
import { formatDateRu as formatDate } from '@/utils/dateFormat';

const categoryLabels: Record<string, string> = {
  ETHICS: 'Этика',
  CULTURAL_DIVERSITY: 'Культурное разнообразие',
  SUPERVISION: 'Супервизия',
  GENERAL: 'Общие',
};

const statusLabels: Record<string, string> = {
  UNCONFIRMED: 'На рассмотрении',
  CONFIRMED: 'Принято',
  REJECTED: 'Отклонено',
  SPENT: 'Использовано',
};

const activityTypeLabels: Record<string, string> = {
  TRAINING_ATTENDANCE:
    'Участие в онлайн- или очных семинарах, воркшопах и тренингах по прикладному анализу поведения (ПАП) или смежным направлениям поведенческого анализа',
  PRESENTATION:
    'Проведение семинара, воркшопа или тренинга по прикладному анализу поведения (ПАП) или смежным направлениям',
  PUBLICATION:
    'Публикация материалов по прикладному анализу поведения или смежным направлениям',
  TEACHING:
    'Преподавание курсов, соответствующих содержательным требованиям и компетенциям уровней Инструктор/Супервизор',
};

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function statusTone(status: string): StatusPillTone {
  if (status === 'CONFIRMED') return 'green';
  if (status === 'REJECTED') return 'danger';
  if (status === 'SPENT') return 'muted';
  return 'warning';
}

function categorySummary(record: CeuHistoryItem) {
  if (record.entries.length === 1) {
    const category = record.entries[0].category;
    return categoryLabels[category] ?? category;
  }
  return 'Несколько (см. детали)';
}

export function CeuPointsHistoryBlock() {
  const [period, setPeriod] = useState<CeuHistoryPeriod>('current');
  const [selectedRecord, setSelectedRecord] = useState<CeuHistoryItem | null>(null);
  const { data, isLoading, error } = useCeuHistory(period);
  const records = data ?? [];

  const handlePeriodChange = (nextPeriod: CeuHistoryPeriod) => {
    setPeriod(nextPeriod);
    setSelectedRecord(null);
  };

  return (
    <section
      id="ceu-history"
      className="mt-5 scroll-mt-5 rounded-[16px] bg-white px-5 py-5 shadow-[0_2px_12px_rgba(0,0,0,0.10)]"
    >
      <h2 className="text-center text-[18px] font-extrabold text-[#1F305E]">История</h2>

      <div
        role="tablist"
        aria-label="Период истории CEU"
        className="mx-auto mb-5 mt-4 grid w-full max-w-[360px] grid-cols-2 rounded-[10px] bg-[#ECEDEF] p-1"
      >
        {([
          { value: 'current', label: 'Текущий цикл' },
          { value: 'legacy', label: 'Старые заявки' },
        ] as const).map((option) => {
          const active = period === option.value;

          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handlePeriodChange(option.value)}
              className={`min-h-[38px] cursor-pointer rounded-[8px] px-3 text-[13px] font-extrabold transition sm:text-[14px] ${
                active
                  ? 'bg-[var(--color-green-brand)] text-[var(--color-blue-dark)] shadow-[0_1px_5px_rgba(117,173,20,0.28)]'
                  : 'text-[#8D96B5] hover:bg-white/70 hover:text-[var(--color-blue-dark)]'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <p className="text-[14px] text-[#6B7894]">Загрузка истории...</p>
      ) : error ? (
        <p className="text-[14px] text-[#FF5364]">Не удалось загрузить историю CEU-баллов</p>
      ) : records.length === 0 ? (
        <p className="text-[14px] text-[#6B7894]">
          {period === 'current'
            ? 'В текущем цикле пока нет заявок.'
            : 'Старых заявок без привязки к циклу нет.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-[14px] text-[#1F305E]">
            <thead>
              <tr className="bg-[#E7F1F4] text-left">
                <th className="rounded-l-[10px] px-4 py-3 font-medium">
                  Название или ведущий тренинга
                </th>
                <th className="px-4 py-3 text-center font-medium">Длительность</th>
                <th className="px-4 py-3 text-center font-medium">Дата</th>
                <th className="px-4 py-3 text-center font-medium">Тема</th>
                <th className="px-4 py-3 text-center font-medium">Статус</th>
                <th className="rounded-r-[10px] px-4 py-3 text-right font-medium" />
              </tr>
            </thead>

            <tbody>
              {records.map((record) => (
                <tr
                  key={record.id}
                  className={`border-b border-[#DCE8EC] last:border-b-0 ${
                    record.isAdminCorrection ? 'bg-[rgba(255,83,100,0.07)]' : ''
                  }`}
                >
                  <td className="max-w-[360px] px-4 py-4">
                    <div className="truncate" title={displayCeuEventName(record.eventName)}>
                      {displayCeuEventName(record.eventName)}
                    </div>
                    {record.isAdminCorrection ? <AdminCorrectionBadge /> : null}
                  </td>
                  <td className="px-4 py-4 text-center font-extrabold">
                    {formatNumber(record.totalValue)}
                  </td>
                  <td className="px-4 py-4 text-center">{formatDate(record.eventDate)}</td>
                  <td className="px-4 py-4 text-center">
                    {categorySummary(record)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <StatusPill
                      tone={statusTone(record.status)}
                      size="custom"
                      className="min-h-[26px] px-3 py-1 text-[12px] font-extrabold leading-tight"
                    >
                      {statusLabels[record.status] ?? record.status}
                    </StatusPill>
                  </td>
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

      {selectedRecord ? (
        <CeuDetailsModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      ) : null}
    </section>
  );
}

function CeuDetailsModal({
  record,
  onClose,
}: {
  record: CeuHistoryItem;
  onClose: () => void;
}) {
  return (
    <ModalShell
      onClose={onClose}
      closeOnBackdrop={false}
      closeOnEscape={false}
      ariaLabelledBy="ceu-history-details-title"
      overlayClassName="z-50 bg-black/70 px-4 py-6"
      dialogClassName="relative max-h-[90vh] w-full max-w-[1080px] overflow-y-auto rounded-[16px] bg-white px-6 py-6 shadow-[0_12px_32px_rgba(0,0,0,0.24)]"
    >
        <ModalCloseButton onClick={onClose} />

        <h3 id="ceu-history-details-title" className="mb-6 text-center text-[22px] font-extrabold text-[#1F305E]">
          {record.isAdminCorrection ? 'Детали корректировки' : 'Детали заявки'}
        </h3>

        {record.isAdminCorrection ? (
          <div className="mb-5 flex justify-center">
            <AdminCorrectionBadge />
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ReadOnlyField label="Длительность" value={formatNumber(record.totalValue)} />
              <ReadOnlyField label="Дата" value={formatDate(record.eventDate)} />
            </div>

            <div>
              <div className="mb-2 text-[13px] font-semibold text-[#1F305E]">Начисленные баллы</div>
              <div className="overflow-hidden rounded-[10px] border border-[#DCE8EC]">
                {record.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-1 gap-3 border-b border-[#DCE8EC] px-3 py-3 last:border-b-0 sm:grid-cols-[minmax(0,190px)_48px_minmax(0,1fr)]"
                  >
                    <span className="min-w-0 break-words pr-2 text-[13px] font-semibold leading-[1.25] text-[#1F305E]">
                      {categoryLabels[entry.category] ?? entry.category}
                    </span>
                    <span className="text-[13px] font-extrabold text-[#1F305E]">
                      {formatNumber(entry.value)}
                    </span>
                    <span className="text-[12px] leading-snug text-[#6B7894]">
                      {entry.isAdminCorrection ? (
                        <span className="font-semibold text-[#C0392B]">
                          было {formatNumber(entry.previousValue ?? 0)} → стало{' '}
                          {formatNumber(entry.value)}
                        </span>
                      ) : entry.activityType ? (
                        activityTypeLabels[entry.activityType] ?? entry.activityType
                      ) : (
                        '—'
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <FilePreview file={record.file} />
          </div>

          <div className="space-y-5">
            <ReadOnlyField
              label="Название или ведущий тренинга"
              value={displayCeuEventName(record.eventName)}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ReadOnlyPlain label="Кандидат" value={record.user.fullName || '—'} mutedLabel />
              <ReadOnlyPlain label="Email" value={record.user.email || '—'} mutedLabel />
            </div>

            <div className="flex justify-center">
              <StatusPill
                tone={statusTone(record.status)}
                size="custom"
                className="min-h-[34px] px-5 py-2 text-[14px] font-extrabold"
              >
                {statusLabels[record.status] ?? record.status}
              </StatusPill>
            </div>

            {record.rejectedReason ? (
              <div className="rounded-[10px] bg-[#FFFFFF] px-4 py-3 text-[14px] text-[#FF5364]">
                {record.rejectedReason}
              </div>
            ) : null}
          </div>
        </div>
    </ModalShell>
  );
}

function AdminCorrectionBadge() {
  return (
    <span className="mt-1 inline-flex items-center rounded-full bg-[rgba(255,83,100,0.14)] px-2.5 py-0.5 text-[11px] font-extrabold text-[#C0392B]">
      Скорректировано администратором
    </span>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-[13px] font-semibold text-[#1F305E]">{label}</div>
      <div className="min-h-[30px] rounded-[8px] bg-[#EFF1F5] px-3 py-1.5 text-[13px] text-[#1F305E]">
        {value}
      </div>
    </div>
  );
}

function ReadOnlyPlain({
  label,
  value,
  mutedLabel = false,
}: {
  label: string;
  value: string;
  mutedLabel?: boolean;
}) {
  return (
    <div>
      <div
        className={`mb-1 text-[13px] font-semibold ${
          mutedLabel ? 'text-[#A7B1C7]' : 'text-[#1F305E]'
        }`}
      >
        {label}
      </div>
      <div className="text-[13px] leading-snug text-[#1F305E]">{value}</div>
    </div>
  );
}

function FilePreview({ file }: { file: CeuHistoryItem['file'] }) {
  if (!file) {
    return (
      <div className="rounded-[10px] bg-white px-4 py-5 text-[13px] text-[#6B7894] shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
        Файл не прикреплен
      </div>
    );
  }

  const fileUrl = `/uploads/${file.fileId}`;
  const isImage = file.mimeType.startsWith('image/');

  return (
    <div className="grid grid-cols-[74px_minmax(0,1fr)_auto] items-center gap-4 rounded-[10px] bg-white px-3 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[4px] border border-[#DCE3EF] bg-white text-[12px] font-bold text-[#A7B1C7]">
        {isImage ? (
          <img src={fileUrl} alt="" className="h-full w-full rounded-[4px] object-cover" />
        ) : (
          'PDF'
        )}
      </div>

      <div className="min-w-0 truncate text-[13px] text-[#1F305E]" title={file.name}>
        {file.name}
      </div>

      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        className="btn h-[34px] rounded-full border border-[#1F305E] px-4 text-[13px] font-semibold text-[#1F305E]"
      >
        Открыть
      </a>
    </div>
  );
}
