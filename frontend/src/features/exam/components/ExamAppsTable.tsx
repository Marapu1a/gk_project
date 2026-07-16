import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ActionArrowButton } from '@/components/ActionArrowButton';
import { AdminIdentityFilterInput } from '@/components/AdminIdentityFilterInput';
import { AdminUserNameLink } from '@/components/AdminUserNameLink';
import { CopyEmailLink } from '@/components/CopyEmailLink';
import { useExamApps } from '../hooks/useExamApps';
import ExamAppModal from './ExamAppModal';
import type { ExamApp, ExamStatus } from '../api/getMyExamApp';
import { examStatusLabels, targetLevelLabels } from '@/utils/labels';
import { NameSortButton, nextNameSortDirection, sortByFullName, type NameSortDirection } from '@/components/NameSortButton';
import { StatusPill, type StatusPillTone } from '@/components/StatusPill';
import { formatDateRu as formatDate } from '@/utils/dateFormat';

const STATUS_OPTIONS: Array<ExamStatus | 'ALL'> = [
  'PENDING',
  'ALL',
  'APPROVED',
  'REJECTED',
];
const STATUS_VALUES = new Set<ExamStatus | 'ALL'>(STATUS_OPTIONS);

function statusTone(status: ExamStatus): StatusPillTone {
  if (status === 'APPROVED') return 'green';
  if (status === 'REJECTED') return 'red';
  if (status === 'PENDING') return 'info';
  return 'neutral';
}

export default function ExamAppsTable() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<ExamApp | null>(null);
  const [nameSort, setNameSort] = useState<NameSortDirection>(null);
  const rawStatus = searchParams.get('status');
  const query = searchParams.get('search') ?? '';
  const { data, isLoading, error, isFetching } = useExamApps(query);
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

  const rows = useMemo(() => (data as ExamApp[] | undefined) ?? [], [data]);
  const filtered = useMemo(() => {
    const filteredRows = rows.filter((row) => {
      const statusOk = status === 'ALL' || row.status === status;
      if (!statusOk) return false;
      return true;
    });
    return sortByFullName(filteredRows, (row) => row.user.fullName || row.user.email, nameSort);
  }, [nameSort, rows, status]);

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
            <AdminIdentityFilterInput
              value={query}
              onChange={(value) => updateQuery({ search: value })}
              className="mt-1"
              placeholder="Введите ФИО, email, телефон или рег. номер"
              ariaLabel="Поиск кандидата"
            />
          </label>
        </div>
      </section>

      <section className="card-section mt-5 overflow-hidden p-0">
        {filtered.length === 0 ? (
          <p className="dashboard-v2-text p-6 text-[#6B7894]">Заявок не найдено.</p>
        ) : (
          <div className="overflow-x-auto p-5">
            <table className="dashboard-v2-text w-full min-w-[940px] table-fixed text-[#1F305E]">
              <thead>
                <tr className="bg-[var(--color-blue-soft)] text-left">
                  <th className="w-[190px] rounded-l-[8px] px-4 py-3 font-medium">
                    <NameSortButton
                      direction={nameSort}
                      onClick={() => setNameSort((current) => nextNameSortDirection(current))}
                    />
                  </th>
                  <th className="w-[190px] px-4 py-3 font-medium">Email</th>
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
                        className="block truncate"
                      >
                        {row.user.fullName || row.user.email || '-'}
                      </AdminUserNameLink>
                    </td>
                    <td className="px-4 py-3">
                      <CopyEmailLink
                        email={row.user.email}
                        className="block max-w-full truncate text-left underline-offset-2 hover:underline"
                      >
                        {row.user.email}
                      </CopyEmailLink>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.cycle?.targetLevel ? targetLevelLabels[row.cycle.targetLevel] : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {formatDate(row.submittedAt ?? row.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusPill
                        tone={statusTone(row.status)}
                        size="custom"
                        className="dashboard-v2-caption px-3 py-1"
                      >
                        {examStatusLabels[row.status] ?? row.status}
                      </StatusPill>
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
