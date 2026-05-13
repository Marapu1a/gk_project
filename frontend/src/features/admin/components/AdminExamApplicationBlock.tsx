import { toast } from 'sonner';
import { Button } from '@/components/Button';
import { usePatchExamAppStatus } from '@/features/exam/hooks/usePatchExamAppStatus';
import { examStatusLabels, targetLevelLabels } from '@/utils/labels';
import type { ExamStatus } from '@/features/exam/api/getMyExamApp';

type ExamApplication = {
  id: string;
  cycleId: string | null;
  status: ExamStatus;
  createdAt: string;
  updatedAt: string;
  cycle: {
    id: string;
    type: 'CERTIFICATION' | 'RENEWAL';
    status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
    targetLevel: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';
    startedAt: string;
  } | null;
} | null;

type Props = {
  userId: string;
  activeCycle: {
    id: string;
    type: 'CERTIFICATION' | 'RENEWAL';
    status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
    targetLevel: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';
    startedAt: string;
  } | null;
  examApplication: ExamApplication;
};

const cycleTypeLabels: Record<string, string> = {
  CERTIFICATION: 'сертификация',
  RENEWAL: 'ресертификация',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ru-RU');
}

export default function AdminExamApplicationBlock({ userId, activeCycle, examApplication }: Props) {
  const mutation = usePatchExamAppStatus();

  const updateStatus = (status: ExamStatus) => {
    mutation.mutate(
      { userId, status, manual: true },
      {
        onSuccess: () => {
          toast.success('Статус заявки обновлен');
        },
        onError: (error: any) => {
          toast.error(error?.response?.data?.error || 'Не удалось обновить заявку');
        },
      },
    );
  };

  return (
    <section
      className="rounded-2xl border bg-white header-shadow overflow-hidden"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-green-light)' }}>
        <h2 className="text-xl font-semibold text-blue-dark">Заявка на экзамен</h2>
      </div>

      <div className="p-6 space-y-4 text-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Meta
            label="Активный цикл"
            value={
              activeCycle
                ? `${cycleTypeLabels[activeCycle.type] ?? activeCycle.type} — ${
                    targetLevelLabels[activeCycle.targetLevel] ?? activeCycle.targetLevel
                  } с ${formatDate(activeCycle.startedAt)}`
                : 'нет активного цикла'
            }
          />
          <Meta
            label="Статус заявки"
            value={
              examApplication
                ? examStatusLabels[examApplication.status] ?? examApplication.status
                : 'заявка еще не создавалась'
            }
          />
          <Meta label="Создана" value={examApplication ? formatDate(examApplication.createdAt) : '—'} />
          <Meta label="Обновлена" value={examApplication ? formatDate(examApplication.updatedAt) : '—'} />
        </div>

        <div className="rounded-xl bg-[var(--color-blue-soft)] px-4 py-3 text-xs text-blue-dark">
          Ручник меняет заявку активного цикла. Старые заявки прошлых циклов больше не блокируют
          новую подачу.
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={mutation.isPending}
            onClick={() => updateStatus('NOT_SUBMITTED')}
          >
            Сбросить
          </Button>
          <Button
            type="button"
            variant="brand"
            disabled={mutation.isPending}
            onClick={() => updateStatus('PENDING')}
          >
            На рассмотрении
          </Button>
          <Button
            type="button"
            variant="accent"
            disabled={mutation.isPending}
            onClick={() => updateStatus('APPROVED')}
          >
            Одобрить
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={mutation.isPending}
            onClick={() => updateStatus('REJECTED')}
          >
            Отклонить
          </Button>
        </div>
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="font-semibold text-blue-dark">{label}:</span>
      <span>{value}</span>
    </div>
  );
}
