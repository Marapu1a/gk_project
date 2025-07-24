import { BackButton } from '@/components/BackButton';
import { useAssignedHours } from '../hooks/useAssignedHours';
import { useUpdateHourStatus } from '../hooks/useUpdateHourStatus';
import { useCreateNotification } from '@/features/notifications/hooks/useNotifications';
import { useState } from 'react';

export function MentorshipReviewForm() {
  const { data, isLoading } = useAssignedHours();
  const mutation = useUpdateHourStatus();
  const createNotification = useCreateNotification();
  const [rejectedReasonMap, setRejectedReasonMap] = useState<Record<string, string>>({});

  if (isLoading) return <p>Загрузка...</p>;
  if (!data) return <p className="text-error">Ошибка загрузки данных</p>;

  const mentorshipHours = data.filter((h) => h.type === 'SUPERVISOR');

  const handleReject = (id: string, userId: string) => {
    const reason = rejectedReasonMap[id] || '';
    mutation.mutate({
      id,
      status: 'REJECTED',
      rejectedReason: reason,
    });

    createNotification.mutate({
      userId,
      type: 'MENTORSHIP',
      message: `Заявка на менторство отклонена: ${reason}`,
    });
  };

  const handleConfirm = (id: string, userId: string) => {
    mutation.mutate({
      id,
      status: 'CONFIRMED',
    });

    createNotification.mutate({
      userId,
      type: 'MENTORSHIP',
      message: `Заявка на менторство подтверждена`,
    });
  };

  if (mentorshipHours.length === 0) {
    return <p>Нет часов менторства для проверки.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto border rounded-xl shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-blue-soft">
            <tr>
              <th className="text-left p-3 border-b border-blue-dark/20">Имя</th>
              <th className="text-left p-3 border-b border-blue-dark/20">Email</th>
              <th className="text-center p-3 border-b border-blue-dark/20">Часы</th>
              <th className="text-center p-3 border-b border-blue-dark/20">Действия</th>
            </tr>
          </thead>
          <tbody>
            {mentorshipHours.map((hour) => (
              <tr key={hour.id} className="hover:bg-gray-50">
                <td className="p-3">{hour.record.user.fullName}</td>
                <td className="p-3">{hour.record.user.email}</td>
                <td className="p-3 text-center">{hour.value}</td>
                <td className="p-3">
                  <div className="flex flex-col items-center gap-2">
                    <input
                      type="text"
                      placeholder="Причина отклонения"
                      className="input w-48"
                      value={rejectedReasonMap[hour.id] || ''}
                      onChange={(e) =>
                        setRejectedReasonMap((prev) => ({
                          ...prev,
                          [hour.id]: e.target.value,
                        }))
                      }
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfirm(hour.id, hour.record.user.id)}
                        className="btn bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                        disabled={mutation.isPending}
                      >
                        Подтвердить
                      </button>
                      <button
                        onClick={() => handleReject(hour.id, hour.record.user.id)}
                        className="btn bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                        disabled={mutation.isPending || !rejectedReasonMap[hour.id]?.trim()}
                      >
                        Отклонить
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <BackButton />
    </>
  );
}
