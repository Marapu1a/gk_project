import { useQualificationProgress } from '@/features/certificate/hooks/useQualificationProgress';
import { CheckCircle, XCircle } from 'lucide-react';

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
  } = useQualificationProgress(activeGroupName);

  if (loading) return <p>Загрузка статуса сертификации...</p>;

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

      {!isEligible && reasons.length > 0 && (
        <div>
          <p className="font-semibold text-red-700">Причины недопуска:</p>
          <ul className="list-disc pl-5 text-sm">
            {reasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
