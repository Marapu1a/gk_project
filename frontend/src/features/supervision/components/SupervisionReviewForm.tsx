import { useAssignedHours } from '../hooks/useAssignedHours';
import { useUpdateHourStatus } from '../hooks/useUpdateHourStatus';
import { useState } from 'react';
import { postNotification } from '@/features/notifications/api/notifications';
import { toast } from 'sonner';

export function SupervisionReviewForm() {
  const { data } = useAssignedHours();
  const mutation = useUpdateHourStatus();
  const [rejectedReasonMap, setRejectedReasonMap] = useState<Record<string, string>>({});

  const typeMap: Record<string, string> = {
    INSTRUCTOR: 'Инструктор',
    CURATOR: 'Куратор',
    SUPERVISOR: 'Супервизор',
    EXPERIENCED_SUPERVISOR: 'Опытный супервизор',
  };

  const handleConfirm = async (id: string, userId: string, userEmail: string) => {
    try {
      await mutation.mutateAsync({ id, status: 'CONFIRMED' });
      await postNotification({
        userId,
        type: 'SUPERVISION',
        message: `Ваши часы супервизии подтверждены (${userEmail})`,
        link: '/history',
      });
      toast.success(`Часы супервизии для ${userEmail} подтверждены`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Ошибка подтверждения');
    }
  };

  const handleReject = async (id: string, reason: string, userId: string, userEmail: string) => {
    if (!reason.trim()) {
      toast.error('Укажите причину отклонения');
      return;
    }
    try {
      await mutation.mutateAsync({ id, status: 'REJECTED', rejectedReason: reason });
      await postNotification({
        userId,
        type: 'SUPERVISION',
        message: `Часы супервизии отклонены (${userEmail}) — причина: ${reason}`,
        link: '/history',
      });
      toast.success(`Часы супервизии для ${userEmail} отклонены`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Ошибка отклонения');
    }
  };

  if (!data || data.length === 0) return null;

  return (
    <div className="overflow-x-auto border rounded-xl shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-blue-soft">
          <tr>
            <th className="text-left p-3 border-b border-blue-dark/20">Имя</th>
            <th className="text-left p-3 border-b border-blue-dark/20">Email</th>
            <th className="text-center p-3 border-b border-blue-dark/20">Тип</th>
            <th className="text-center p-3 border-b border-blue-dark/20">Часы</th>
            <th className="text-center p-3 border-b border-blue-dark/20">Действия</th>
          </tr>
        </thead>
        <tbody>
          {data
            .filter((h) => h.type === 'INSTRUCTOR' || h.type === 'CURATOR')
            .map((hour) => (
              <tr key={hour.id} className="hover:bg-gray-50">
                <td className="p-3">{hour.record.user.fullName}</td>
                <td className="p-3">{hour.record.user.email}</td>
                <td className="p-3 text-center">{typeMap[hour.type] || hour.type}</td>
                <td className="p-3 text-center">{hour.value}</td>
                <td className="p-3">
                  <div className="flex flex-col items-center gap-2">
                    <input
                      type="text"
                      placeholder="Причина отклонения"
                      className="input w-48"
                      value={rejectedReasonMap[hour.id] || ''}
                      onChange={(e) =>
                        setRejectedReasonMap((prev) => ({ ...prev, [hour.id]: e.target.value }))
                      }
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleConfirm(hour.id, hour.record.user.id, hour.record.user.email)
                        }
                        className="btn"
                        style={{ backgroundColor: 'var(--color-green-dark)', color: 'white' }}
                        disabled={mutation.isPending}
                      >
                        Подтвердить
                      </button>
                      <button
                        onClick={() =>
                          handleReject(
                            hour.id,
                            rejectedReasonMap[hour.id],
                            hour.record.user.id,
                            hour.record.user.email,
                          )
                        }
                        className="btn"
                        style={{ backgroundColor: '#e3342f', color: 'white' }}
                        disabled={mutation.isPending}
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
  );
}
