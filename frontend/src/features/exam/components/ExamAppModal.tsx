import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { postNotification } from '@/features/notifications/api/notifications';
import { usePatchExamAppStatus } from '../hooks/usePatchExamAppStatus';
import { StatusPill } from '@/components/StatusPill';

type ExamStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type ExamAppModalProps = {
  app: {
    id: string;
    userId: string;
    status: ExamStatus;
    createdAt: string;
    updatedAt: string;
    user: { email: string; fullName: string | null };
  };
  onClose: () => void;
};

const statusLabel: Record<ExamStatus, string> = {
  NOT_SUBMITTED: 'не отправлена',
  PENDING: 'ожидает',
  APPROVED: 'подтверждена',
  REJECTED: 'отклонена',
};

export default function ExamAppModal({ app, onClose }: ExamAppModalProps) {
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();
  const mutate = usePatchExamAppStatus();

  const doChange = (next: ExamStatus) => {
    if (next === 'REJECTED' && !comment.trim()) {
      alert('Нужен комментарий для отклонения.');
      return;
    }

    mutate.mutate(
      { userId: app.userId, status: next, comment },
      {
        onSuccess: async () => {
          const message =
            next === 'APPROVED'
              ? 'Заявка на экзамен одобрена'
              : next === 'REJECTED'
                ? `Заявка на экзамен отклонена: ${comment.trim()}`
                : 'Заявка на экзамен сброшена, можно подать заново';

          try {
            await postNotification({
              userId: app.userId,
              type: 'EXAM',
              message,
              link: '/dashboard',
            });
          } finally {
            queryClient.invalidateQueries({ queryKey: ['exam-apps'] });
            onClose();
          }
        },
      },
    );
  };

  const disabled = mutate.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl border"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b header-shadow"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          <h3 className="text-xl font-semibold text-blue-dark">Заявка на экзамен</h3>
          <button className="nav-btn" onClick={onClose} disabled={disabled}>
            Закрыть
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <div className="text-blue-dark font-medium">Email:</div>
            <div>{app.user.email}</div>

            <div className="text-blue-dark font-medium">Имя:</div>
            <div>{app.user.fullName || '—'}</div>

            <div className="text-blue-dark font-medium">Статус:</div>
            <div className="inline-flex items-center gap-2">
              <span>{statusLabel[app.status]}</span>
              {app.status === 'APPROVED' && <StatusPill tone="green">OK</StatusPill>}
              {app.status === 'REJECTED' && <StatusPill tone="red">ERR</StatusPill>}
              {app.status === 'PENDING' && <StatusPill>WAIT</StatusPill>}
            </div>

            <div className="text-blue-dark font-medium">Обновлено:</div>
            <div>{new Date(app.updatedAt).toLocaleDateString('ru-RU')}</div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-blue-dark">
              Комментарий (обязателен для отклонения)
            </label>
            <textarea
              className="input"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Причина решения…"
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t flex items-center justify-end gap-2"
          style={{ borderColor: 'var(--color-green-light)' }}
        >
          {app.status === 'REJECTED' && (
            <button
              className="btn btn-accent"
              onClick={() => doChange('NOT_SUBMITTED')}
              disabled={disabled}
            >
              Сбросить
            </button>
          )}

          {app.status === 'PENDING' && (
            <>
              <button
                className="btn btn-brand"
                onClick={() => doChange('APPROVED')}
                disabled={disabled}
              >
                Одобрить
              </button>
              <button
                className="btn btn-danger"
                onClick={() => doChange('REJECTED')}
                disabled={disabled}
              >
                Отклонить
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
