// src/features/certificate/components/QualificationStatusBlock.tsx
import { useQualificationProgress } from '@/features/certificate/hooks/useQualificationProgress';
import { CheckCircle, XCircle } from 'lucide-react';

// Экзаменная секция подключается ТОЛЬКО для не-супервизоров
import { useMyExamApp } from '@/features/exam/hooks/useMyExamApp';
import { usePatchExamAppStatus } from '@/features/exam/hooks/usePatchExamAppStatus';
import { getModerators } from '@/features/notifications/api/moderators';
import { postNotification } from '@/features/notifications/api/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { examStatusLabels } from '@/utils/labels';

export function QualificationStatusBlock({
  activeGroupName,
}: {
  activeGroupName: string | undefined;
}) {
  const isSupervisor = activeGroupName === 'Супервизор' || activeGroupName === 'Опытный Супервизор';

  const {
    targetGroup,
    isEligible,
    ceuReady,
    supervisionReady, // для супервизоров это логика менторства (меняем только подпись)
    documentsReady,
    loading,
    reasons,
    examPaid, // используем ТОЛЬКО в экзаменной секции (не для супервизоров)
  } = useQualificationProgress(activeGroupName) as any;

  // Нормализуем причины недопуска под роль
  const normalizedReasons =
    (reasons as string[] | undefined)?.reduce<string[]>((acc, r) => {
      let reason = r;

      if (isSupervisor) {
        // 1) У супервизоров CEU не считаются => отбрасываем любые CEU-причины
        const isCeuReason =
          /ceu/i.test(reason) ||
          /ceu-?балл/i.test(reason) ||
          /балл(ов)?\s*ceu/i.test(reason) ||
          /недостаточно\s+ceu/i.test(reason);
        if (isCeuReason) return acc;

        // 2) «супервизия» → «менторство»
        reason = reason.replace(/супервизии/gi, 'менторства').replace(/супервизия/gi, 'менторство');
      }

      acc.push(reason);
      return acc;
    }, []) ?? [];

  if (loading) {
    return (
      <div
        className="rounded-2xl border header-shadow bg-white p-6 text-sm"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        Загрузка статуса…
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border header-shadow bg-white"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-green-light)' }}>
        <h3 className="text-lg font-semibold text-blue-dark">
          Сертификация (первичная или продление действующего сертификата)
        </h3>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-4 text-sm">
        {targetGroup && (
          <p>
            <strong>Целевая группа:</strong> {targetGroup}
          </p>
        )}

        <ul className="space-y-1">
          {/* CEU показываем только если это НЕ супервизор */}
          {!isSupervisor && (
            <li className="flex items-center gap-2">
              {ceuReady ? (
                <CheckCircle className="text-green-600" size={18} />
              ) : (
                <XCircle className="text-red-600" size={18} />
              )}
              CEU-баллы: {ceuReady ? 'достаточно' : 'недостаточно'}
            </li>
          )}

          <li className="flex items-center gap-2">
            {supervisionReady ? (
              <CheckCircle className="text-green-600" size={18} />
            ) : (
              <XCircle className="text-red-600" size={18} />
            )}
            {isSupervisor ? 'Часы менторства' : 'Часы супервизии'}:{' '}
            {supervisionReady ? 'достаточно' : 'недостаточно'}
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
            <span className="text-green-700 font-semibold">допуск получен</span>
          ) : (
            <span className="text-red-700 font-semibold">допуска нет</span>
          )}
        </p>

        {/* Экзаменная часть полностью скрыта для супервизоров */}
        {!isSupervisor && <ExamSection isEligible={!!isEligible} examPaid={!!examPaid} />}

        {!isEligible && normalizedReasons.length > 0 && (
          <div>
            <p className="font-semibold text-red-700">Причины недопуска:</p>
            <ul className="list-disc pl-5 text-sm">
              {normalizedReasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/** Рендерится ТОЛЬКО для не-супервизоров, чтобы не дёргать экзаменные хуки у супервизоров */
function ExamSection({ isEligible, examPaid }: { isEligible: boolean; examPaid: boolean }) {
  const { data: app, isLoading: appLoading } = useMyExamApp();
  const patchStatus = usePatchExamAppStatus();
  const queryClient = useQueryClient();

  const isResubmission = app?.status === 'REJECTED';

  const canSubmit =
    isEligible === true &&
    examPaid === true &&
    (app?.status === 'NOT_SUBMITTED' || isResubmission) &&
    !patchStatus.isPending;

  const onSubmit = () => {
    if (!app?.userId) return;
    patchStatus.mutate(
      { userId: app.userId, status: 'PENDING' },
      {
        onSuccess: async () => {
          try {
            const moderators = await getModerators();
            const email = app.user?.email || 'без email';

            // Только админы
            const admins = (moderators || []).filter(
              (u: any) => u?.role === 'ADMIN' || u?.roles?.includes?.('ADMIN'),
            );

            if (admins.length === 0) {
              console.warn('Нет получателей-админов для уведомления EXAM');
              return;
            }

            await Promise.all(
              admins.map((m: any) =>
                postNotification({
                  userId: m.id,
                  type: 'EXAM',
                  message: `Новая заявка на экзамен от ${email}`,
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

  if (appLoading) {
    return <div className="text-sm">Загрузка заявки…</div>;
  }

  return canSubmit ? (
    <button onClick={onSubmit} className="btn btn-brand" disabled={patchStatus.isPending}>
      {patchStatus.isPending
        ? 'Отправляем…'
        : isResubmission
          ? 'Отправить заявку повторно'
          : 'Отправить заявку на экзамен'}
    </button>
  ) : (
    <div className="font-semibold space-y-1">
      {app ? (
        <div>Заявка на экзамен: {examStatusLabels[app.status] || app.status}.</div>
      ) : (
        <div>Заявка отсутствует.</div>
      )}
      {isEligible !== true && <div>Нет допуска — сначала выполните условия.</div>}
      {examPaid !== true && <div>Нет оплаты экзамена — оплатите, чтобы отправить заявку.</div>}
    </div>
  );
}
