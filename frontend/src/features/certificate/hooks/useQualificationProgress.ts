// src/features/certificate/hooks/useQualificationProgress.ts
import { useCeuSummary } from '@/features/ceu/hooks/useCeuSummary';
import { useSupervisionSummary } from '@/features/supervision/hooks/useSupervisionSummary';
import { useGetDocReviewReq } from '@/features/documentReview/hooks/useGetDocReviewReq';
import { useUserPayments } from '@/features/payment/hooks/useUserPayments';
import type { CeuSummaryResponse } from '@/features/ceu/api/getCeuSummary';
import type { SupervisionSummaryResponse } from '@/features/supervision/api/getSupervisionSummary';

// режим сертификации
type QualificationMode = 'EXAM' | 'RENEWAL';

// enum цели (как в targetLevel / backend)
type TargetLevelEnum = 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';

const RU_BY_LEVEL: Record<TargetLevelEnum, string> = {
  INSTRUCTOR: 'Инструктор',
  CURATOR: 'Куратор',
  SUPERVISOR: 'Супервизор',
};

type QualificationProgress = {
  mode: QualificationMode;
  targetGroup: string | null;
  isEligible: boolean;
  ceuReady: boolean;
  supervisionReady: boolean;
  documentsReady: boolean;
  documentReviewPaid: boolean;
  requiredPaymentsPaid: boolean;
  loading: boolean;
  reasons: string[];
};

export function useQualificationProgress(
  activeGroupName: string | undefined,
  targetLevel?: TargetLevelEnum | null,
): QualificationProgress & { examPaid: boolean } {
  const { data: ceuSummary, isLoading: ceuLoading } = useCeuSummary() as {
    data: CeuSummaryResponse;
    isLoading: boolean;
  };

  const { data: supervisionSummary, isLoading: supervisionLoading } =
    useSupervisionSummary() as {
      data: SupervisionSummaryResponse;
      isLoading: boolean;
    };

  const { data: docReview, isLoading: docLoading } = useGetDocReviewReq();
  const { data: payments, isLoading: paymentsLoading } = useUserPayments();

  // 🔧 нормализуем имя группы
  const g = (activeGroupName ?? '').toLowerCase().trim();
  const isSupervisorGroup = g === 'супервизор';
  const isExperiencedSupervisorGroup = g === 'опытный супервизор';

  const mode: QualificationMode =
    isSupervisorGroup || isExperiencedSupervisorGroup ? 'RENEWAL' : 'EXAM';

  // 👇 целевая группа только из targetLevel (только для EXAM)
  const targetGroup = mode === 'EXAM' && targetLevel ? RU_BY_LEVEL[targetLevel] : null;

  // === CEU ===
  let ceuReady = false;

  if (ceuSummary?.percent) {
    const p = ceuSummary.percent as any;

    if (isSupervisorGroup || isExperiencedSupervisorGroup) {
      // супервизоры / опытные супервизоры — годовая норма 4+4+4+12
      ceuReady =
        p.ethics >= 100 &&
        p.cultDiver >= 100 &&
        p.supervision >= 100 &&
        p.general >= 100;
    } else {
      // обычный экзаменационный путь
      const supervisionOk =
        targetGroup === 'Супервизор' ? p.supervision >= 100 : true;

      ceuReady =
        p.ethics >= 100 &&
        p.cultDiver >= 100 &&
        supervisionOk &&
        p.general >= 100;
    }
  } else {
    ceuReady = false;
  }

  // === Supervision / менторство ===
  let supervisionReady = false;

  if (mode === 'EXAM') {
    // классический путь: практика + супервизия
    const p = (supervisionSummary?.percent || {}) as any;
    supervisionReady = p.practice >= 100 && p.supervision >= 100;
  } else {
    // RENEWAL — только супервизоры / опытные супервизоры
    if (isExperiencedSupervisorGroup) {
      // опытный супервизор набирает только CEU-баллы
      supervisionReady = true;
    } else if (isSupervisorGroup) {
      // обычный супервизор: смотрим на менторскую шкалу с бэка
      const mentor = (supervisionSummary as any)?.mentor as
        | { total: number; required: number; percent: number; pending: number }
        | null
        | undefined;

      if (mentor && typeof mentor.required === 'number' && mentor.required > 0) {
        supervisionReady =
          mentor.percent >= 100 || mentor.total >= mentor.required;
      } else {
        supervisionReady = false;
      }
    } else {
      supervisionReady = false;
    }
  }

  // === Документы + платежи ===
  const isPaid = (type: 'DOCUMENT_REVIEW' | 'EXAM_ACCESS' | 'REGISTRATION' | 'FULL_PACKAGE') =>
    (payments ?? []).some((p) => p.type === type && p.status === 'PAID');

  const fullPackagePaid = isPaid('FULL_PACKAGE');
  const registrationPaid = fullPackagePaid || isPaid('REGISTRATION');
  const documentReviewPaid = fullPackagePaid || isPaid('DOCUMENT_REVIEW');
  const examPaid = fullPackagePaid || isPaid('EXAM_ACCESS');

  const documentsReady = docReview?.status === 'CONFIRMED';

  const requiredPaymentsPaid =
    mode === 'EXAM'
      ? registrationPaid && documentReviewPaid && examPaid
      : documentReviewPaid;

  // Причины (только EXAM — супервизорам причины не показываем)
  const reasons: string[] = [];
  if (mode === 'EXAM') {
    if (!targetGroup) reasons.push('Цель сертификации не выбрана');
    if (!ceuReady) reasons.push('Недостаточно CEU-баллов');
    if (!supervisionReady) reasons.push('Недостаточно часов супервизии');
    if (!documentsReady) reasons.push('Документы не подтверждены');
    if (!documentReviewPaid) reasons.push('Проверка документов не оплачена');
    if (!registrationPaid || !examPaid) reasons.push('Не все платежи оплачены');
  }

  // ✅ Допуск
  const hasTarget = !!targetGroup;

  const isEligible =
    mode === 'RENEWAL'
      ? ceuReady && supervisionReady && documentsReady
      : hasTarget && ceuReady && supervisionReady && documentsReady;

  return {
    mode,
    targetGroup,
    isEligible,
    ceuReady,
    supervisionReady,
    documentsReady,
    documentReviewPaid,
    requiredPaymentsPaid,
    loading: ceuLoading || supervisionLoading || docLoading || paymentsLoading,
    reasons,
    examPaid,
  };
}
