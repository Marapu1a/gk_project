import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ActionArrowButton } from '@/components/ActionArrowButton';
import { AdminUserNameLink } from '@/components/AdminUserNameLink';
import { useExamApps } from '../hooks/useExamApps';
import ExamAppModal from './ExamAppModal';
import type { ExamApp, ExamStatus } from '../api/getMyExamApp';
import { examStatusLabels, targetLevelLabels } from '@/utils/labels';

const STATUS_OPTIONS: Array<ExamStatus | 'ALL'> = [
  'PENDING',
  'ALL',
  'APPROVED',
  'REJECTED',
];
const STATUS_VALUES = new Set<ExamStatus | 'ALL'>(STATUS_OPTIONS);

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<ExamApp | null>(null);
  const rawStatus = searchParams.get('status');
  const query = searchParams.get('search') ?? '';
  const status: ExamStatus | 'ALL' = STATUS_VALUES.has(rawStatus as ExamStatus | 'ALL')
    ? (rawStatus as ExamStatus | 'ALL')
    : 'PENDING';

  const updateQuery = (patch: Record<string, string | null | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      const stringValue = value == null ? '' : String(value);
      if (!stringValue || (key === 'status' && stringValue === 'PENDING')) {
        next.delete(key);
      } else {
        next.set(key, stringValue);
      }
    });
    setSearchParams(next, { replace: true });
  };

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
              onChange={(event) => updateQuery({ status: event.target.value })}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'ALL' ? 'Все заявки' : examStatusLabels[option]}
                </option>
              ))}
            </select>
          </label>

          <label className="dashboard-v2-small block text-[#1F305E] md:col-span-1 xl:col-span-2">
            Кандидат
            <input
              className="input-design mt-1"
              value={query}
              onChange={(event) => updateQuery({ search: event.target.value })}
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
                  <th className="rounded-l-[8px] px-4 py-3 font-medium">ФИО</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="w-[170px] px-4 py-3 text-center font-medium">Цель</th>
                  <th className="w-[150px] px-4 py-3 text-center font-medium">Дата подачи</th>
                  <th className="w-[170px] px-4 py-3 text-center font-medium">
                    Статус
                  </th>
                  <th className="w-[56px] rounded-r-[8px] px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="group border-b border-[#DCE8EC] transition-colors hover:bg-white/70 last:border-b-0"
                  >
                    <td className="px-4 py-3 font-extrabold">
                      <AdminUserNameLink
                        userId={row.userId}
                        fullName={row.user.fullName}
                        email={row.user.email}
                      >
                        {row.user.fullName || row.user.email || '-'}
                      </AdminUserNameLink>
                    </td>
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
                    <td className="px-4 py-3 text-center">
                      <ActionArrowButton
                        onClick={() => setSelected(row)}
                        title="Открыть заявку"
                        aria-label="Открыть заявку"
                      />
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
