import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserGroupsByEmail } from '../hooks/useUserGroupsByEmail';
import { useUpdateUserGroups } from '../hooks/useUpdateUserGroups';
import { fetchCurrentUser } from '@/features/auth/api/me';

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
    if (data) {
      setSelectedGroupIds(data.currentGroupIds);
    }
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

  const handleSave = () => {
    if (!data?.user.id) return;
    mutation.mutate(selectedGroupIds);
  };

  const getActiveGroupName = () => {
    const selectedGroups = data?.allGroups
      .filter((group) => selectedGroupIds.includes(group.id))
      .sort((a, b) => b.rank - a.rank);

    return selectedGroups?.[0]?.name || '—';
  };

  const maxAssignableRank =
    currentUser?.role === 'ADMIN' ? Infinity : (currentUser?.activeGroup?.rank ?? 0);

  return (
    <div className="overflow-x-auto border rounded-xl shadow-sm">
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 p-3 items-center border-b border-blue-dark/20"
      >
        <input
          type="email"
          placeholder="Введите email"
          className="input w-64"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="btn btn-brand" disabled={!email}>
          Показать
        </button>
      </form>

      {isLoading && <p className="text-sm text-gray-500 p-3">Загрузка...</p>}
      {error && <p className="text-error p-3">Ошибка загрузки</p>}

      {data && (
        <div className="p-3 space-y-4">
          <div className="text-sm">
            <p>
              <strong>Имя:</strong> {data.user.fullName}
            </p>
            <p>
              <strong>Email:</strong> {data.user.email}
            </p>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-blue-soft">
              <tr>
                <th className="text-left p-3 border-b border-blue-dark/20">Группа</th>
                <th className="text-center p-3 border-b border-blue-dark/20">Входит</th>
                <th className="text-center p-3 border-b border-blue-dark/20">Разрешено?</th>
              </tr>
            </thead>
            <tbody>
              {data.allGroups.map((group) => {
                const isDisabled = group.rank > maxAssignableRank;
                return (
                  <tr key={group.id} className="hover:bg-gray-50">
                    <td className="p-3">{group.name}</td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedGroupIds.includes(group.id)}
                        onChange={() => toggleGroup(group.id)}
                        disabled={isDisabled}
                      />
                    </td>
                    <td className="p-3 text-center">
                      {isDisabled ? (
                        <span className="text-error text-xs italic">Недостаточно прав</span>
                      ) : (
                        '✓'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="text-sm italic">
            Текущая активная группа: <strong>{getActiveGroupName()}</strong>
          </p>

          <button onClick={handleSave} className="btn btn-brand" disabled={mutation.isPending}>
            Сохранить изменения
          </button>

          {mutation.isSuccess && <p className="text-sm text-green-600">Сохранено успешно</p>}
          {mutation.isError && <p className="text-error">Ошибка при сохранении</p>}
        </div>
      )}
    </div>
  );
}
