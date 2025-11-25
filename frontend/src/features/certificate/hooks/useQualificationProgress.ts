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

  const mode: QualificationMode =
    g === 'супервизор' || g === 'опытный супервизор' ? 'RENEWAL' : 'EXAM';

  // 👇 ключевая правка: целевая группа только из targetLevel
  const targetGroup =
    mode === 'EXAM' && targetLevel ? RU_BY_LEVEL[targetLevel] : null;

  // === CEU ===
  const ceuReady =
    !!ceuSummary?.percent &&
    ceuSummary.percent.ethics >= 100 &&
    ceuSummary.percent.cultDiver >= 100 &&
    (targetGroup === 'Супервизор' ? ceuSummary.percent.supervision >= 100 : true) &&
    ceuSummary.percent.general >= 100;

  // === Supervision / менторство ===
  let supervisionReady = false;
  if (mode === 'EXAM') {
    supervisionReady =
      !!supervisionSummary?.percent &&
      (supervisionSummary.percent as any).practice >= 100 &&
      (supervisionSummary.percent as any).supervision >= 100;
  } else {
    const usablePractice = (supervisionSummary?.usable as any)?.practice ?? 0;
    const usableSupervision = (supervisionSummary?.usable as any)?.supervision ?? 0;
    const usableSupervisor = (supervisionSummary?.usable as any)?.supervisor ?? 0;
    const totalUsable = usablePractice + usableSupervision + usableSupervisor;
    const REQUIRED_TOTAL = 2000;
    supervisionReady = totalUsable >= REQUIRED_TOTAL;
  }

  // Документы + оплата проверки документов
  const documentPayment = payments?.find((p) => p.type === 'DOCUMENT_REVIEW');
  const documentsReady =
    docReview?.status === 'CONFIRMED' && documentPayment?.status === 'PAID';

  // Экзаменная оплата (нужна только в EXAM)
  const examPaid = (payments ?? []).some(
    (p) => p.type === 'EXAM_ACCESS' && p.status === 'PAID',
  );

  // Причины (только EXAM)
  const reasons: string[] = [];
  if (mode === 'EXAM') {
    if (!targetGroup) reasons.push('Цель сертификации не выбрана');
    if (!ceuReady) reasons.push('Недостаточно CEU-баллов');
    if (!supervisionReady) reasons.push('Недостаточно часов супервизии');
    if (!documentsReady) reasons.push('Документы не подтверждены или не оплачены');
  }

  // ✅ Допуск
  const hasTarget = !!targetGroup;

  const isEligible =
    mode === 'RENEWAL'
      ? ceuReady && documentsReady
      : hasTarget && ceuReady && supervisionReady && documentsReady;

  return {
    mode,
    targetGroup,
    isEligible,
    ceuReady,
    supervisionReady,
    documentsReady,
    loading: ceuLoading || supervisionLoading || docLoading || paymentsLoading,
    reasons,
    examPaid,
  };
}
