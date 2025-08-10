import { useCeuSummary } from '@/features/ceu/hooks/useCeuSummary';
import { useSupervisionSummary } from '@/features/supervision/hooks/useSupervisionSummary';
import { useGetDocReviewReq } from '@/features/documentReview/hooks/useGetDocReviewReq';
import { useUserPayments } from '@/features/payment/hooks/useUserPayments';
import type { CeuSummaryResponse } from '@/features/ceu/api/getCeuSummary';
import type { SupervisionSummaryResponse } from '@/features/supervision/api/getSupervisionSummary';

const GROUP_PROGRESS_PATH: Record<string, string | null> = {
  студент: 'Инструктор',
  инструктор: 'Куратор',
  куратор: 'Супервизор',
  супервизор: null,
  'опытный супервизор': null,
};

type QualificationMode = 'EXAM' | 'RENEWAL';

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
  activeGroupName: string | undefined
): QualificationProgress {
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

  const mode: QualificationMode =
    activeGroupName === 'супервизор' || activeGroupName === 'опытный супервизор'
      ? 'RENEWAL'
      : 'EXAM';

  const targetGroup =
    mode === 'EXAM' && activeGroupName
      ? GROUP_PROGRESS_PATH[activeGroupName] ?? null
      : null;

  const ceuReady =
    !!ceuSummary?.percent &&
    ceuSummary.percent.ethics >= 100 &&
    ceuSummary.percent.cultDiver >= 100 &&
    (targetGroup === 'Супервизор'
      ? ceuSummary.percent.supervision >= 100
      : true) &&
    ceuSummary.percent.general >= 100;

  const supervisionReady =
    !!supervisionSummary?.percent &&
    supervisionSummary.percent.instructor >= 100 &&
    supervisionSummary.percent.curator >= 100;

  const documentPayment = payments?.find(
    (p) => p.type === 'DOCUMENT_REVIEW'
  );
  const documentsReady =
    docReview?.status === 'CONFIRMED' &&
    documentPayment?.status === 'PAID';

  const reasons: string[] = [];

  if (mode === 'EXAM') {
    if (!ceuReady) reasons.push('Недостаточно CEU-баллов');
    if (!supervisionReady) reasons.push('Недостаточно часов супервизии');
    if (!documentsReady)
      reasons.push('Документы не подтверждены или не оплачены');
  }

  return {
    mode,
    targetGroup,
    isEligible: mode === 'RENEWAL' || (ceuReady && supervisionReady && documentsReady),
    ceuReady,
    supervisionReady,
    documentsReady,
    loading: ceuLoading || supervisionLoading || docLoading || paymentsLoading,
    reasons,
  };
}
