import { useQualificationProgress } from '@/features/certificate/hooks/useQualificationProgress';
import { useMyExamApp } from '@/features/exam/hooks/useMyExamApp';
import { usePatchExamAppStatus } from '@/features/exam/hooks/usePatchExamAppStatus';
import { getModerators } from '@/features/notifications/api/moderators';
import { postNotification } from '@/features/notifications/api/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle, XCircle } from 'lucide-react';

const statusLabels: Record<'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED', string> = {
  NOT_SUBMITTED: 'не отправлена',
  PENDING: 'ожидает',
  APPROVED: 'подтверждена',
  REJECTED: 'отклонена',
};

export function QualificationStatusBlock({
  activeGroupName,
}: {
  activeGroupName: string | undefined;
}) {
  const {
    mode,
    targetGroup,
    isEligible,
    ceuReady,
    supervisionReady,
    documentsReady,
    loading,
    reasons,
    examPaid, // может быть undefined — ок
  } = useQualificationProgress(activeGroupName) as any;

  const { data: app, isLoading: appLoading } = useMyExamApp();
  const patchStatus = usePatchExamAppStatus();
  const queryClient = useQueryClient();

  if (loading || appLoading) return <p>Загрузка статуса сертификации...</p>;

  const canSubmit =
    isEligible === true &&
    examPaid === true &&
    app?.status === 'NOT_SUBMITTED' &&
    !patchStatus.isPending;

  const onSubmit = () => {
    if (!app?.userId) return;
    patchStatus.mutate(
      { userId: app.userId, status: 'PENDING' },
      {
        onSuccess: async () => {
          try {
            const moderators = await getModerators(); // админы/модераторы
            await Promise.all(
              moderators.map((m) =>
                postNotification({
                  userId: m.id,
                  type: 'EXAM',
                  message: 'Новая заявка на экзамен',
                  link: '/exam-applications',
                }),
              ),
            );
          } finally {
            queryClient.invalidateQueries({ queryKey: ['exam-apps'] });
          }
        },
      },
    );
  };

  return (
    <div className="border rounded-xl p-4 space-y-4 bg-white shadow">
      <h3 className="text-lg font-semibold text-blue-dark">
        Сертификация ({mode === 'EXAM' ? 'Первичная' : 'Продление'})
      </h3>

      {targetGroup && (
        <p>
          <strong>Целевая группа:</strong> {targetGroup}
        </p>
      )}

      <ul className="space-y-1">
        <li className="flex items-center gap-2">
          {ceuReady ? (
            <CheckCircle className="text-green-600" size={18} />
          ) : (
            <XCircle className="text-red-600" size={18} />
          )}
          CEU-баллы: {ceuReady ? 'достаточно' : 'недостаточно'}
        </li>
        <li className="flex items-center gap-2">
          {supervisionReady ? (
            <CheckCircle className="text-green-600" size={18} />
          ) : (
            <XCircle className="text-red-600" size={18} />
          )}
          Часы супервизии: {supervisionReady ? 'достаточно' : 'недостаточно'}
        </li>
        <li className="flex items-center gap-2">
          {documentsReady ? (
            <CheckCircle className="text-green-600" size={18} />
          ) : (
            <XCircle className="text-red-600" size={18} />
          )}
          Документы: {documentsReady ? 'подтверждены' : 'не подтверждены'}
        </li>
      </ul>

      <p>
        <strong>Общий статус:</strong>{' '}
        {isEligible ? (
          <span className="text-green-700 font-semibold">допущен к сертификации</span>
        ) : (
          <span className="text-red-700 font-semibold">не допущен</span>
        )}
      </p>

      {app && (
        <p>
          <strong>Заявка на экзамен:</strong>{' '}
          <span className="font-semibold">
            {statusLabels[app.status as keyof typeof statusLabels]}
          </span>
        </p>
      )}

      {canSubmit ? (
        <button onClick={onSubmit} className="btn btn-brand" disabled={patchStatus.isPending}>
          {patchStatus.isPending ? 'Отправляем…' : 'Отправить заявку на экзамен'}
        </button>
      ) : (
        <div className="text-sm text-gray-600 space-y-1">
          {app ? (
            <div>
              Заявка уже в статусе: {statusLabels[app.status as keyof typeof statusLabels]}.
            </div>
          ) : (
            <div>Заявка отсутствует.</div>
          )}
          {isEligible !== true && <div>Нет допуска — сначала выполните условия.</div>}
          {examPaid !== true && <div>Нет оплаты экзамена — оплатите, чтобы отправить заявку.</div>}
        </div>
      )}

      {!isEligible && reasons?.length > 0 && (
        <div>
          <p className="font-semibold text-red-700">Причины недопуска:</p>
          <ul className="list-disc pl-5 text-sm">
            {reasons.map((reason: string, idx: number) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
