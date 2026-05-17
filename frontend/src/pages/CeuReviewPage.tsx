import { useMemo, useRef, useState } from 'react';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { DashboardButton } from '@/components/DashboardButton';
import { useAdminCeuHistory } from '@/features/admin/hooks/ceu/useAdminCeuHistory';
import type {
  AdminCeuCategory,
  AdminCeuHistoryRow,
  AdminCeuSortBy,
  AdminCeuSortDir,
  AdminCeuStatus,
} from '@/features/admin/api/ceu/getAdminCeuHistory';
import { ceuCategoryLabels, recordStatusLabels, targetLevelLabels } from '@/utils/labels';

const activityTypeLabels: Record<string, string> = {
  TRAINING_ATTENDANCE: 'Участие в семинаре/тренинге',
  PRESENTATION: 'Проведение семинара/тренинга',
  PUBLICATION: 'Публикация материалов',
  TEACHING: 'Преподавание курсов',
};

const cycleTypeLabels: Record<string, string> = {
  CERTIFICATION: 'сертификация',
  RENEWAL: 'ресертификация',
};

const cycleStatusLabels: Record<string, string> = {
  ACTIVE: 'активный',
  COMPLETED: 'закрыт',
  ABANDONED: 'прерван',
};

const commonGroups = [
  '',
  'Соискатель',
  'Инструктор',
  'Куратор',
  'Супервизор',
  'Опытный Супервизор',
];

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function csvCell(value: unknown) {
  const text = String(value ?? '').replaceAll('"', '""');
  return `"${text}"`;
}

function downloadCsv(rows: AdminCeuHistoryRow[]) {
  const header = [
    'Дата добавления',
    'Дата мероприятия',
    'Email',
    'Группа',
    'Категория',
    'Баллы',
    'Статус',
    'Тип CEU',
    'Цикл',
    'Файл',
  ];

  const lines = rows.map((row) =>
    [
      formatDateTime(row.recordCreatedAt),
      formatDate(row.eventDate),
      row.email,
      row.currentGroup?.name ?? '',
      ceuCategoryLabels[row.category] ?? row.category,
      row.points,
      recordStatusLabels[row.status] ?? row.status,
      row.activityType ? activityTypeLabels[row.activityType] ?? row.activityType : '',
      row.cycle
        ? `${cycleTypeLabels[row.cycle.type] ?? row.cycle.type}, ${
            targetLevelLabels[row.cycle.targetLevel] ?? row.cycle.targetLevel
          }, ${cycleStatusLabels[row.cycle.status] ?? row.cycle.status}`
        : '',
      row.file?.name ?? '',
    ]
      .map(csvCell)
      .join(';')
  );

  const csv = [header.map(csvCell).join(';'), ...lines].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ceu_history_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function statusClass(status: AdminCeuStatus) {
  if (status === 'CONFIRMED') return 'bg-green-100 text-green-700';
  if (status === 'REJECTED') return 'bg-[#FF5364] text-white';
  if (status === 'SPENT') return 'bg-gray-100 text-gray-600';
  return 'bg-yellow-100 text-yellow-700';
}

export default function CeuReviewPage() {
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('');
  const [category, setCategory] = useState<AdminCeuCategory | 'ALL'>('ALL');
  const [status, setStatus] = useState<AdminCeuStatus | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<AdminCeuSortBy>('group');
  const [sortDir, setSortDir] = useState<AdminCeuSortDir>('asc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(100);

  const params = useMemo(
    () => ({
      createdFrom,
      createdTo,
      search: search.trim(),
      group,
      category,
      status,
      sortBy,
      sortDir,
      page,
      perPage,
    }),
    [category, createdFrom, createdTo, group, page, perPage, search, sortBy, sortDir, status]
  );

  const { data, isLoading, error, isFetching } = useAdminCeuHistory(params);
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const resetPage = (fn: () => void) => {
    setPage(1);
    fn();
  };

  const setSort = (nextSortBy: AdminCeuSortBy) => {
    setPage(1);
    if (sortBy === nextSortBy) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(nextSortBy);
    setSortDir(nextSortBy === 'createdAt' ? 'desc' : 'asc');
  };

  const syncScroll = (source: 'top' | 'table') => {
    const top = topScrollRef.current;
    const table = tableScrollRef.current;
    if (!top || !table) return;

    if (source === 'top') {
      table.scrollLeft = top.scrollLeft;
      return;
    }

    top.scrollLeft = table.scrollLeft;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <BackButton />
        <DashboardButton />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-blue-dark">История CEU-баллов</h1>
        <p className="mt-1 text-sm text-gray-600">
          Журнал показывает CEU-записи по дате добавления. Это помогает найти старые сертификаты,
          загруженные в период миграции циклов.
        </p>
      </div>

      <section className="card-section space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block text-sm text-blue-dark">
            Добавлено с
            <input
              type="date"
              value={createdFrom}
              onChange={(e) => resetPage(() => setCreatedFrom(e.target.value))}
              className="input-design mt-1"
            />
          </label>

          <label className="block text-sm text-blue-dark">
            Добавлено по
            <input
              type="date"
              value={createdTo}
              onChange={(e) => resetPage(() => setCreatedTo(e.target.value))}
              className="input-design mt-1"
            />
          </label>

          <label className="block text-sm text-blue-dark">
            Поиск по email или ФИО
            <input
              value={search}
              onChange={(e) => resetPage(() => setSearch(e.target.value))}
              className="input-design mt-1"
              placeholder="mail@example.com"
            />
          </label>

          <label className="block text-sm text-blue-dark">
            Группа
            <select
              value={group}
              onChange={(e) => resetPage(() => setGroup(e.target.value))}
              className="input-design mt-1"
            >
              {commonGroups.map((item) => (
                <option key={item || 'all'} value={item}>
                  {item || 'Все группы'}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-blue-dark">
            Категория
            <select
              value={category}
              onChange={(e) =>
                resetPage(() => setCategory(e.target.value as AdminCeuCategory | 'ALL'))
              }
              className="input-design mt-1"
            >
              <option value="ALL">Все категории</option>
              <option value="ETHICS">Этика</option>
              <option value="CULTURAL_DIVERSITY">Культурное разнообразие</option>
              <option value="SUPERVISION">Супервизия</option>
              <option value="GENERAL">Общие</option>
            </select>
          </label>

          <label className="block text-sm text-blue-dark">
            Статус
            <select
              value={status}
              onChange={(e) => resetPage(() => setStatus(e.target.value as AdminCeuStatus | 'ALL'))}
              className="input-design mt-1"
            >
              <option value="ALL">Все статусы</option>
              <option value="UNCONFIRMED">Не подтверждено</option>
              <option value="CONFIRMED">Подтверждено</option>
              <option value="REJECTED">Отклонено</option>
              <option value="SPENT">Использовано</option>
            </select>
          </label>

          <label className="block text-sm text-blue-dark">
            Сортировка
            <select
              value={sortBy}
              onChange={(e) => resetPage(() => setSortBy(e.target.value as AdminCeuSortBy))}
              className="input-design mt-1"
            >
              <option value="group">Группа</option>
              <option value="createdAt">Дата добавления</option>
              <option value="eventDate">Дата мероприятия</option>
              <option value="email">Email</option>
              <option value="category">Категория</option>
              <option value="status">Статус</option>
              <option value="points">Баллы</option>
            </select>
          </label>

          <label className="block text-sm text-blue-dark">
            Порядок
            <select
              value={sortDir}
              onChange={(e) => resetPage(() => setSortDir(e.target.value as AdminCeuSortDir))}
              className="input-design mt-1"
            >
              <option value="asc">По возрастанию</option>
              <option value="desc">По убыванию</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-soft pt-4">
          <div className="text-sm text-gray-600">
            Найдено: <span className="font-bold text-blue-dark">{total}</span>
            {isFetching && !isLoading ? <span className="ml-2">обновляю…</span> : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-blue-dark">
              Строк
              <select
                value={perPage}
                onChange={(e) => {
                  setPage(1);
                  setPerPage(Number(e.target.value));
                }}
                className="input-design w-24"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
            </label>

            <Button type="button" variant="ghost" onClick={() => downloadCsv(rows)} disabled={!rows.length}>
              CSV текущей страницы
            </Button>
          </div>
        </div>
      </section>

      <section className="card-section overflow-hidden p-0">
        {isLoading ? (
          <div className="p-6 text-gray-600">Загрузка истории...</div>
        ) : error ? (
          <div className="p-6 text-[#FF5364]">Не удалось загрузить историю CEU.</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-gray-600">За выбранный период записей не найдено.</div>
        ) : (
          <div className="space-y-2">
            <div
              ref={topScrollRef}
              onScroll={() => syncScroll('top')}
              className="overflow-x-scroll [scrollbar-color:var(--color-blue-dark)_var(--color-blue-soft)] [scrollbar-width:thin]"
            >
              <div className="h-1 w-[1470px]" />
            </div>
            <div
              ref={tableScrollRef}
              onScroll={() => syncScroll('table')}
              className="overflow-x-scroll pb-3 [scrollbar-color:var(--color-blue-dark)_var(--color-blue-soft)] [scrollbar-width:thin]"
            >
            <table className="w-[1470px] table-fixed text-left text-sm">
              <thead className="bg-[var(--color-blue-soft)] text-blue-dark">
                <tr>
                  <th className="w-[130px] px-4 py-3">
                    <button type="button" className="font-bold" onClick={() => setSort('createdAt')}>
                      Добавлено {sortBy === 'createdAt' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="w-[120px] px-4 py-3">
                    <button type="button" className="font-bold" onClick={() => setSort('eventDate')}>
                      Мероприятие {sortBy === 'eventDate' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="w-[220px] px-4 py-3">
                    <button type="button" className="font-bold" onClick={() => setSort('email')}>
                      Email {sortBy === 'email' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="w-[160px] px-4 py-3">
                    <button type="button" className="font-bold" onClick={() => setSort('group')}>
                      Группа {sortBy === 'group' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="w-[190px] px-4 py-3">
                    <button type="button" className="font-bold" onClick={() => setSort('category')}>
                      Категория {sortBy === 'category' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="w-[90px] px-4 py-3">
                    <button type="button" className="font-bold" onClick={() => setSort('points')}>
                      Баллы {sortBy === 'points' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="w-[160px] px-4 py-3">
                    <button type="button" className="font-bold" onClick={() => setSort('status')}>
                      Статус {sortBy === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </button>
                  </th>
                  <th className="w-[210px] px-4 py-3">Цикл</th>
                  <th className="w-[190px] px-4 py-3">Файл</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.entryId} className="border-b border-soft align-top">
                    <td className="px-4 py-3 text-blue-dark">{formatDateTime(row.recordCreatedAt)}</td>
                    <td className="px-4 py-3">{formatDate(row.eventDate)}</td>
                    <td className="px-4 py-3">
                      <a href={`mailto:${row.email}`} className="text-blue-dark underline-offset-2 hover:underline">
                        {row.email}
                      </a>
                    </td>
                    <td className="px-4 py-3">{row.currentGroup?.name || '—'}</td>
                    <td className="px-4 py-3">{ceuCategoryLabels[row.category] ?? row.category}</td>
                    <td className="px-4 py-3 font-bold text-blue-dark">{row.points}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${statusClass(row.status)}`}>
                        {recordStatusLabels[row.status] ?? row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {row.cycle ? (
                        <>
                          <div>
                            {cycleTypeLabels[row.cycle.type] ?? row.cycle.type},{' '}
                            {targetLevelLabels[row.cycle.targetLevel] ?? row.cycle.targetLevel}
                          </div>
                          <div>
                            {cycleStatusLabels[row.cycle.status] ?? row.cycle.status}, старт{' '}
                            {formatDate(row.cycle.startedAt)}
                          </div>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.file ? (
                        <a
                          href={`/uploads/${row.file.fileId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-dark underline-offset-2 hover:underline"
                        >
                          {row.file.name}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 text-xs text-gray-500">
              Таблицу можно прокрутить по горизонтали
            </div>
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          Страница {Math.min(page, totalPages)} из {totalPages}
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Назад
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            Вперёд
          </Button>
        </div>
      </div>
    </div>
  );
}
