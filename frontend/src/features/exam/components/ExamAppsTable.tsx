import { useMemo, useState } from 'react';
import { useExamApps } from '../hooks/useExamApps';
import ExamAppModal from './ExamAppModal';
import { DashboardButton } from '@/components/DashboardButton';
import { StatusPill } from '@/components/StatusPill';

type ExamStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

type ExamRow = {
  id: string;
  userId: string;
  status: ExamStatus;
  createdAt: string;
  updatedAt: string;
  user: { email: string; fullName: string | null };
};

export default function ExamAppsTable() {
  const { data, isLoading, error } = useExamApps();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<ExamRow | null>(null);

  const rows = (data as ExamRow[] | undefined) ?? [];
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.user.email.toLowerCase().includes(s));
  }, [rows, q]);

  if (isLoading) return <p>Загрузка заявок…</p>;
  if (error) return <p className="text-error">Ошибка загрузки заявок</p>;

  return (
    <>
      <div className="space-y-4">
        {/* Заголовок + поиск */}
        <div
          className="rounded-2xl border header-shadow"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          <div
            className="px-6 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--color-green-light)' }}
          >
            <h2 className="text-lg font-semibold text-blue-dark">Заявки на экзамен</h2>
          </div>

          <div className="px-6 py-4">
            <form onSubmit={(e) => e.preventDefault()} className="flex items-end gap-3">
              <div className="w-full max-w-sm">
                <label className="block mb-1 text-sm text-blue-dark">Поиск по email</label>
                <input
                  className="input"
                  placeholder="email@example.com"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </form>
          </div>
        </div>

        {/* Таблица */}
        <div
          className="overflow-x-auto rounded-2xl border shadow-sm"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="text-blue-dark" style={{ background: 'var(--color-blue-soft)' }}>
                <th className="p-3 text-left w-56">Email</th>
                <th className="p-3 text-left w-56">Имя</th>
                <th className="p-3 text-left w-40">Статус</th>
                <th className="p-3 text-left w-48">Обновлено</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-t hover:bg-gray-50 cursor-pointer"
                  style={{ borderColor: 'var(--color-green-light)' }}
                  onClick={() => setSelected(r)}
                >
                  <td className="p-3 truncate">{r.user.email}</td>
                  <td className="p-3 truncate">{r.user.fullName || '—'}</td>
                  <td className="p-3">
                    {r.status === 'APPROVED' && <StatusPill tone="green">подтверждена</StatusPill>}
                    {r.status === 'REJECTED' && <StatusPill tone="red">отклонена</StatusPill>}
                    {r.status === 'PENDING' && <StatusPill>ожидает</StatusPill>}
                    {r.status === 'NOT_SUBMITTED' && <span>не отправлена</span>}
                  </td>
                  <td className="p-3">{new Date(r.updatedAt).toLocaleDateString('ru-RU')}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="p-3 text-gray-500" colSpan={4}>
                    Ничего не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selected && <ExamAppModal app={selected} onClose={() => setSelected(null)} />}
      </div>

      <DashboardButton />
    </>
  );
}
