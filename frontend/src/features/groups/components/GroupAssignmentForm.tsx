import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { examStatusLabels, paymentStatusLabels } from '@/utils/labels';
import { useUserGroupsByEmail } from '../hooks/useUserGroupsByEmail';
import { useUpdateUserGroups } from '../hooks/useUpdateUserGroups';
import { fetchCurrentUser } from '@/features/auth/api/me';
import { toast } from 'sonner';
import { BackButton } from '@/components/BackButton';
import { Link } from 'react-router-dom';

export function GroupAssignmentForm() {
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  const { data, isLoading, error } = useUserGroupsByEmail(submittedEmail, !!submittedEmail);
  const mutation = useUpdateUserGroups(data?.user.id ?? '');

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (data) setSelectedGroupIds(data.currentGroupIds);
  }, [data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedEmail(email.trim());
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId],
    );
  };

  const confirmToast = (message: string) =>
    new Promise<boolean>((resolve) => {
      toast(message, {
        action: { label: 'Да', onClick: () => resolve(true) },
        cancel: { label: 'Отмена', onClick: () => resolve(false) },
      });
    });

  const handleSave = async () => {
    if (!data?.user.id) return;
    const ok = await confirmToast('Сохранить изменения групп пользователя?');
    if (!ok) return;

    try {
      await mutation.mutateAsync(selectedGroupIds);
      // Тост об успехе показывает хук
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Ошибка при сохранении');
    }
  };

  const getActiveGroupName = () => {
    const selected = data?.allGroups
      .filter((g) => selectedGroupIds.includes(g.id))
      .sort((a, b) => b.rank - a.rank);
    return selected?.[0]?.name || '—';
  };

  const maxAssignableRank =
    currentUser?.role === 'ADMIN' ? Infinity : (currentUser?.activeGroup?.rank ?? 0);

  return (
    <div
      className="rounded-2xl border header-shadow bg-white overflow-hidden"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      <div
        className="px-6 py-4 border-b flex items-center gap-3"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <h2 className="text-xl font-semibold text-blue-dark">Назначение групп</h2>

        <form onSubmit={handleSubmit} className="ml-auto flex gap-2 items-center">
          <input
            type="email"
            placeholder="Введите email"
            className="input w-64"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="btn btn-brand" disabled={!email.trim()}>
            Показать
          </button>
        </form>
      </div>

      <div className="p-6 space-y-4">
        {isLoading && <p className="text-sm text-blue-dark">Загрузка…</p>}
        {error && <p className="text-error">Ошибка загрузки</p>}

        {data && (
          <>
            <div className="text-sm">
              <p>
                <strong>Имя:</strong> {data.user.fullName}
              </p>
              <p>
                <strong>Email:</strong> {data.user.email}
              </p>
            </div>

            <div
              className="overflow-x-auto rounded-2xl border"
              style={{ borderColor: 'var(--color-green-light)' }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-blue-dark" style={{ background: 'var(--color-blue-soft)' }}>
                    <th className="p-3 text-left">Группа</th>
                    <th className="p-3 text-center">Входит</th>
                    <th className="p-3 text-center">Разрешено?</th>
                  </tr>
                </thead>
                <tbody>
                  {data.allGroups.map((group) => {
                    const isDisabled = group.rank > maxAssignableRank;
                    const checked = selectedGroupIds.includes(group.id);
                    return (
                      <tr
                        key={group.id}
                        className="border-t hover:bg-gray-50"
                        style={{ borderColor: 'var(--color-green-light)' }}
                      >
                        <td className="p-3">{group.name}</td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleGroup(group.id)}
                            disabled={isDisabled || mutation.isPending}
                          />
                        </td>
                        <td className="p-3 text-center">
                          {isDisabled ? (
                            <span className="text-error text-xs italic">Недостаточно прав</span>
                          ) : (
                            <span className="text-green-700">✓</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-sm italic">
              Текущая активная группа: <strong>{getActiveGroupName()}</strong>
            </p>

            <div className="flex gap-2">
              <button onClick={handleSave} className="btn btn-brand" disabled={mutation.isPending}>
                {mutation.isPending ? 'Сохраняем…' : 'Сохранить изменения'}
              </button>
            </div>

            {mutation.data?.upgraded && (
              <div
                className="mt-4 p-4 rounded-2xl border text-sm"
                style={{
                  borderColor: 'var(--color-yellow)',
                  background: 'var(--color-yellow-soft)',
                  color: 'var(--color-blue-dark)',
                }}
              >
                <div className="space-y-1">
                  <p>
                    <strong>Списано CEU:</strong> {mutation.data.burned}
                  </p>
                  {mutation.data.examReset && (
                    <p>
                      <strong>Заявка на экзамен:</strong> сброшена (статус:{' '}
                      {examStatusLabels.NOT_SUBMITTED}).
                    </p>
                  )}
                  {mutation.data.examPaymentReset && (
                    <p>
                      <strong>Оплата экзамена:</strong> сброшена (статус:{' '}
                      {paymentStatusLabels.UNPAID}).
                    </p>
                  )}
                  <p>
                    <strong>Далее:</strong> выдайте соответствующий сертификат —{' '}
                    <Link to="/certificate" className="text-brand underline">
                      перейти к выдаче
                    </Link>
                    .
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <BackButton />
    </div>
  );
}
