import { useState } from 'react';
import { format } from 'date-fns';
import { useCeuHistory } from '../hooks/useCeuHistory';
import type { CeuHistoryItem } from '../api/getCeuHistory';
import { displayCeuEventName } from '../utils/displayCeuEventName';

const EXIT_ICON = '/dashboard-v2/exit_btn.svg';

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

function formatDate(value: string) {
  return format(new Date(value), 'dd.MM.yyyy');
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function statusTextClass(status: string) {
  if (status === 'CONFIRMED') return 'text-[#1F305E]';
  if (status === 'REJECTED') return 'text-[#FF5364]';
  return 'text-[#7F8AA3]';
}

export function CeuPointsHistoryBlock() {
  const [selectedRecord, setSelectedRecord] = useState<CeuHistoryItem | null>(null);
  const { data, isLoading, error } = useCeuHistory();
  const records = data ?? [];

  return (
    <section
      id="ceu-history"
      className="mt-5 scroll-mt-5 rounded-[16px] bg-white px-5 py-5 shadow-[0_2px_12px_rgba(0,0,0,0.10)]"
    >
      <h2 className="mb-5 text-center text-[18px] font-extrabold text-[#1F305E]">История</h2>

      {isLoading ? (
        <p className="text-[14px] text-[#6B7894]">Загрузка истории...</p>
      ) : error ? (
        <p className="text-[14px] text-[#FF5364]">Не удалось загрузить историю CEU-баллов</p>
      ) : records.length === 0 ? (
        <p className="text-[14px] text-[#6B7894]">Пока нет заявок.</p>
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
                <tr key={record.id} className="border-b border-[#DCE8EC] last:border-b-0">
                  <td className="max-w-[360px] px-4 py-4">
                    <div className="truncate" title={displayCeuEventName(record.eventName)}>
                      {displayCeuEventName(record.eventName)}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center font-extrabold">
                    {formatNumber(record.value)}
                  </td>
                  <td className="px-4 py-4 text-center">{formatDate(record.eventDate)}</td>
                  <td className="px-4 py-4 text-center">
                    {categoryLabels[record.category] ?? record.category}
                  </td>
                  <td className={`px-4 py-4 text-center ${statusTextClass(record.status)}`}>
                    {statusLabels[record.status] ?? record.status}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="relative max-h-[90vh] w-full max-w-[1080px] overflow-y-auto rounded-[16px] bg-white px-6 py-6 shadow-[0_12px_32px_rgba(0,0,0,0.24)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-3 flex h-11 w-11 cursor-pointer items-center justify-center opacity-55 transition hover:opacity-100"
          aria-label="Закрыть"
        >
          <img src={EXIT_ICON} alt="" className="h-5 w-5" />
        </button>

        <h3 className="mb-6 text-center text-[22px] font-extrabold text-[#1F305E]">
          Детали заявки
        </h3>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyField label="Длительность" value={formatNumber(record.value)} />
              <ReadOnlyField label="Дата" value={formatDate(record.eventDate)} />
            </div>

            <ReadOnlyPlain
              label="Тема CEU"
              value={categoryLabels[record.category] ?? record.category}
            />

            <FilePreview file={record.file} />
          </div>

          <div className="space-y-5">
            <ReadOnlyField
              label="Название или ведущий тренинга"
              value={displayCeuEventName(record.eventName)}
            />

            <ReadOnlyPlain
              label="Тип CEU"
              value={
                record.activityType
                  ? activityTypeLabels[record.activityType] ?? record.activityType
                  : '—'
              }
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyPlain label="Кандидат" value={record.user.fullName || '—'} mutedLabel />
              <ReadOnlyPlain label="Email" value={record.user.email || '—'} mutedLabel />
            </div>

            <div className="rounded-[10px] bg-[#C8CEDB] px-4 py-3 text-center text-[14px] font-extrabold text-[#6B7894]">
              {statusLabels[record.status] ?? record.status}
            </div>

            {record.rejectedReason ? (
              <div className="rounded-[10px] bg-[#FFFFFF] px-4 py-3 text-[14px] text-[#FF5364]">
                {record.rejectedReason}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
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
