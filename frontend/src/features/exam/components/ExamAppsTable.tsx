import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useExamApps } from '../hooks/useExamApps';
import ExamAppModal from './ExamAppModal';
import type { ExamApp, ExamStatus } from '../api/getMyExamApp';
import { examStatusLabels, targetLevelLabels } from '@/utils/labels';

const STATUS_OPTIONS: Array<ExamStatus | 'ALL'> = [
  'PENDING',
  'ALL',
  'APPROVED',
  'REJECTED',
  'NOT_SUBMITTED',
];

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('ru-RU');
}

function statusClass(status: ExamStatus) {
  if (status === 'APPROVED') return 'bg-[var(--color-green-brand)] text-white';
  if (status === 'REJECTED') return 'bg-[var(--color-danger)] text-white';
  if (status === 'PENDING') return 'bg-[var(--color-blue-soft)] text-[#1F305E]';
  return 'bg-[#EEF0F4] text-[#6B7894]';
}

export default function ExamAppsTable() {
  const { data, isLoading, error, isFetching } = useExamApps();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ExamStatus | 'ALL'>('PENDING');
  const [selected, setSelected] = useState<ExamApp | null>(null);

  const rows = (data as ExamApp[] | undefined) ?? [];
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      const statusOk = status === 'ALL' || row.status === status;
      if (!statusOk) return false;
      if (!search) return true;

      return (
        row.user.email.toLowerCase().includes(search) ||
        (row.user.fullName ?? '').toLowerCase().includes(search)
      );
    });
  }, [query, rows, status]);

  if (isLoading) {
    return <p className="dashboard-v2-text text-[#6B7894]">Загрузка заявок...</p>;
  }

  if (error) {
    return <p className="dashboard-v2-text text-[var(--color-danger)]">Ошибка загрузки заявок</p>;
  }

  return (
    <>
      <section className="card-section space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="dashboard-v2-text text-[#6B7894]">
            Найдено: <span className="font-extrabold text-[#1F305E]">{filtered.length}</span>
            {isFetching ? <span className="ml-2">обновляю...</span> : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="dashboard-v2-small block text-[#1F305E]">
            Статус
            <select
              className="input-design mt-1"
              value={status}
              onChange={(event) => setStatus(event.target.value as ExamStatus | 'ALL')}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'ALL' ? 'Все статусы' : examStatusLabels[option]}
                </option>
              ))}
            </select>
          </label>

          <label className="dashboard-v2-small block text-[#1F305E] md:col-span-1 xl:col-span-2">
            Кандидат
            <input
              className="input-design mt-1"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ФИО или email"
            />
          </label>
        </div>
      </section>

      <section className="card-section mt-5 overflow-hidden p-0">
        {filtered.length === 0 ? (
          <p className="dashboard-v2-text p-6 text-[#6B7894]">Заявок не найдено.</p>
        ) : (
          <div className="p-5">
            <table className="dashboard-v2-text w-full table-fixed text-[#1F305E]">
              <thead>
                <tr className="bg-[var(--color-blue-soft)] text-left">
                  <th className="w-[56px] rounded-l-[8px] px-4 py-3 font-medium" />
                  <th className="px-4 py-3 font-medium">ФИО</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="w-[170px] px-4 py-3 text-center font-medium">Цель</th>
                  <th className="w-[150px] px-4 py-3 text-center font-medium">Дата подачи</th>
                  <th className="w-[170px] rounded-r-[8px] px-4 py-3 text-center font-medium">
                    Статус
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-[#DCE8EC] last:border-b-0">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelected(row)}
                        className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full bg-[var(--color-blue-dark)] text-white transition hover:bg-[var(--color-blue-darker)]"
                        title="Открыть заявку"
                        aria-label="Открыть заявку"
                      >
                        <ArrowRight size={18} />
                      </button>
                    </td>
                    <td className="px-4 py-3 font-extrabold">{row.user.fullName || '-'}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`mailto:${row.user.email}`}
                        className="truncate underline-offset-2 hover:underline"
                      >
                        {row.user.email}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.cycle?.targetLevel ? targetLevelLabels[row.cycle.targetLevel] : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {formatDate(row.submittedAt ?? row.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`dashboard-v2-caption inline-flex rounded-full px-3 py-1 ${statusClass(row.status)}`}
                      >
                        {examStatusLabels[row.status] ?? row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected ? <ExamAppModal app={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}
