// src/features/certificate/hooks/useQualificationProgress.ts
import { useCeuSummary } from '@/features/ceu/hooks/useCeuSummary';
import { useSupervisionSummary } from '@/features/supervision/hooks/useSupervisionSummary';
import { useGetDocReviewReq } from '@/features/documentReview/hooks/useGetDocReviewReq';
import { useUserPayments } from '@/features/payment/hooks/useUserPayments';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { useMyCertificates } from '@/features/certificate/hooks/useMyCertificates';
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
  const { data: currentUser, isLoading: currentUserLoading } = useCurrentUser();
  const { data: certificates, isLoading: certificatesLoading } = useMyCertificates();

  // Режим задаёт активный цикл, а не текущая группа пользователя.
  // Это важно для ресертификации Инструкторов и Кураторов.
  const mode: QualificationMode =
    currentUser?.activeCycle?.type === 'RENEWAL' ? 'RENEWAL' : 'EXAM';

  // 👇 целевая группа только из targetLevel (только для EXAM)
  const targetGroup = mode === 'EXAM' && targetLevel ? RU_BY_LEVEL[targetLevel] : null;

  // === CEU ===
  let ceuReady = false;

  if (ceuSummary?.required) {
    const required = ceuSummary.required;
    const usable = ceuSummary.usable;
    ceuReady = (['ethics', 'cultDiver', 'supervision', 'general'] as const).every(
      (key) => required[key] <= 0 || usable[key] >= required[key],
    );
  }

  // === Supervision / менторство ===
  const isExperiencedSupervisor = activeGroupName === 'Опытный Супервизор';

  // Experienced supervisors have no hour requirements — consistent with buildExamReadiness.
  let supervisionReady = isExperiencedSupervisor;

  if (!isExperiencedSupervisor && supervisionSummary?.required) {
    const required = supervisionSummary.required;
    const usable = supervisionSummary.usable;
    supervisionReady =
      (required.practice <= 0 || usable.practice >= required.practice) &&
      (required.supervision <= 0 || usable.supervision >= required.supervision) &&
      (required.supervisor <= 0 || usable.supervisor >= required.supervisor);
  }

  // === Документы + платежи ===
  const isPaid = (
    type: 'DOCUMENT_REVIEW' | 'EXAM_ACCESS' | 'REGISTRATION' | 'FULL_PACKAGE' | 'RENEWAL',
  ) =>
    (payments ?? []).some((p) => p.type === type && p.status === 'PAID');

  const fullPackagePaid = isPaid('FULL_PACKAGE');
  const registrationPaid = fullPackagePaid || isPaid('REGISTRATION');
  const documentReviewPaid = mode === 'RENEWAL' || fullPackagePaid || isPaid('DOCUMENT_REVIEW');
  const examPaid = fullPackagePaid || isPaid('EXAM_ACCESS');
  const renewalPaid = isPaid('RENEWAL');

  const activeCycleId = currentUser?.activeCycle?.id ?? null;
  const documentsBelongToActiveCycle = activeCycleId
    ? docReview?.cycleId === activeCycleId
    : false;
  const documentsReady =
    (docReview?.status === 'CONFIRMED' && documentsBelongToActiveCycle) ||
    (mode === 'RENEWAL' && Boolean(certificates?.length));

  const requiredPaymentsPaid =
    mode === 'EXAM'
      ? registrationPaid && documentReviewPaid && examPaid
      : renewalPaid;

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
    loading:
      ceuLoading ||
      supervisionLoading ||
      docLoading ||
      paymentsLoading ||
      currentUserLoading ||
      certificatesLoading,
    reasons,
    examPaid,
  };
}
