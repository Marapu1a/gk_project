import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { PageNav } from '@/components/PageNav';
import { AdminUserSearch } from '@/features/admin/components/AdminUserSearch';
import { DashboardPagination } from '@/components/DashboardPagination';

type Task = { id: string; kind: string; createdAt: string; candidate?: string; state: string };
type Row = {
  id: string; fullName: string; email: string; recipient?: string;
  cooperation?: number; hours?: number; oldest?: string; days?: number; lastSent?: string;
  date?: string; status?: string; isTest?: boolean; error?: string;
  count?: number; pending?: number; processed?: number; unavailable?: number; tasks?: Task[];
};
type Result = { rows: Row[]; total: number; pageSize: number };
const date = (value?: string) => value ? new Date(value).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }) : '—';

export default function AdminReviewerRemindersPage() {
  const [view, setView] = useState<'pending' | 'history'>('pending');
  const [search, setSearch] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [tests, setTests] = useState(false);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const params = { view, reviewerId, tests: tests ? '1' : '0', page };
  const query = useQuery({ queryKey: ['admin-reviewer-reminders', params],
    queryFn: async () => (await api.get<Result>('/admin/reviewer-reminders', { params })).data });
  async function download() {
    setExporting(true);
    try {
      const response = await api.get('/admin/reviewer-reminders', { params: { ...params, export: 'xlsx' }, responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `напоминания-${view}.xlsx`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { toast.error('Не удалось выгрузить отчёт. Если записей больше 5000, уточните поиск.'); }
    finally { setExporting(false); }
  }
  const button = 'rounded-xl border border-[#B8C1D6] px-4 py-2 disabled:opacity-50';
  return <div className="container-fixed space-y-5 py-6 text-[var(--color-blue-dark)]">
    <PageNav />
    <h1 className="text-center text-2xl font-bold">Напоминания проверяющим</h1>
    <section className="space-y-4 rounded-2xl bg-white p-5 shadow-soft">
      <div className="flex flex-wrap gap-3" role="tablist" aria-label="Раздел отчёта">
        {(['pending', 'history'] as const).map((tab) => <button key={tab} role="tab" aria-selected={view === tab}
          className={`${button} ${view === tab ? 'bg-[var(--color-blue-dark)] text-white' : ''}`}
          onClick={() => { setView(tab); setPage(1); setExpanded(null); }}>
          {tab === 'pending' ? 'Ожидают решения' : 'История напоминаний'}
        </button>)}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <AdminUserSearch size="large" value={search}
          onChange={(value) => { setSearch(value); setReviewerId(''); setPage(1); setExpanded(null); }}
          onSelect={(user) => { setSearch(user.fullName || user.email); setReviewerId(user.id); setPage(1); setExpanded(null); }} />
        <button type="button" className={button} onClick={() => { setSearch(''); setReviewerId(''); setPage(1); setExpanded(null); }}>Сбросить</button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {view === 'history' && <label className="flex items-center gap-2"><input type="checkbox" checked={tests}
            onChange={(e) => { setTests(e.target.checked); setPage(1); }} />Показывать также тестовые письма</label>}
        <button className={button} disabled={exporting || query.isPending || query.isError} onClick={download}>
          {exporting ? 'Выгружаем…' : 'Выгрузить XLSX'}
        </button>
      </div>
      <p className="text-sm text-[#7884a2]">{view === 'pending'
        ? 'Сначала показаны проверяющие, чьи обращения дольше всего ожидают решения. Последнее напоминание — письмо, принятое почтовым сервером.'
        : 'Обработка показана на текущий момент для задач из конкретного письма. Приём SMTP не означает доставку или прочтение. Недоступные задачи не считаются обработанными.'} Время — московское.</p>
      {query.isPending ? <p>Загрузка…</p> : query.isError ? <div role="alert">
        Не удалось загрузить отчёт. <button className={button} onClick={() => query.refetch()}>Повторить</button>
      </div> : <>
        <p>Найдено: {query.data.total}</p>
        {!query.data.rows.length ? <p>Записей нет.</p> : <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-[var(--color-blue-soft)]"><tr>
              {(view === 'pending' ? ['Проверяющий', 'Сотрудничества', 'Заявки часов', 'Ожидает решения с', 'Последнее напоминание']
                : ['Проверяющий / дата', 'Результат отправки', 'Задачи', 'Обработка', 'Подробности']).map((h) => <th key={h} className="p-3">{h}</th>)}
            </tr></thead>
            <tbody>{query.data.rows.map((row) => <tr key={row.id} className="border-b border-[#E3EBEE] align-top">
              <td className="p-3"><div className="font-semibold">{row.fullName || 'Без имени'}</div><div>{row.email}</div>
                {view === 'history' && <div className="mt-1 text-xs">{date(row.date)}{row.isTest ? ' · ТЕСТ' : ''}</div>}</td>
              {view === 'pending' ? <>
                <td className="p-3">{row.cooperation}</td><td className="p-3">{row.hours}</td>
                <td className="p-3">{date(row.oldest)}{row.oldest && <div>{row.days} дн.</div>}</td>
                <td className="p-3">{date(row.lastSent)}</td>
              </> : <>
                <td className="p-3">{row.status}{row.error && <div className="mt-1 text-xs">{row.error}</div>}</td>
                <td className="p-3">{row.count}</td>
                <td className="p-3">Обработано: {row.processed}<br />Ожидает: {row.pending}<br />Недоступно: {row.unavailable}</td>
                <td className="p-3"><button className={button} aria-expanded={expanded === row.id}
                  onClick={() => setExpanded(expanded === row.id ? null : row.id)}>Состав письма</button>
                  {expanded === row.id && <div className="mt-3 max-h-80 min-w-64 space-y-3 overflow-auto">
                    <p>Получатель: {row.recipient}</p>
                    {row.tasks?.map((task) => <div key={`${task.kind}:${task.id}`} className="rounded-lg bg-[var(--color-blue-soft)] p-2">
                      <div>{task.kind === 'hours' ? 'Заявка часов' : 'Сотрудничество'} · {task.candidate || 'Имя недоступно'}</div>
                      <div>{date(task.createdAt)} · {task.state}</div><div className="break-all text-xs">ID: {task.id}</div>
                    </div>)}
                  </div>}
                </td>
              </>}
            </tr>)}</tbody>
          </table>
        </div>}
        <DashboardPagination page={page} totalPages={Math.max(1, Math.ceil(query.data.total / query.data.pageSize))} onPageChange={setPage} />
      </>}
    </section>
  </div>;
}
