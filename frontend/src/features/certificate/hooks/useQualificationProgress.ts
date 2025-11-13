// src/features/certificate/hooks/useQualificationProgress.ts
import { useCeuSummary } from '@/features/ceu/hooks/useCeuSummary';
import { useSupervisionSummary } from '@/features/supervision/hooks/useSupervisionSummary';
import { useGetDocReviewReq } from '@/features/documentReview/hooks/useGetDocReviewReq';
import { useUserPayments } from '@/features/payment/hooks/useUserPayments';
import type { CeuSummaryResponse } from '@/features/ceu/api/getCeuSummary';
import type { SupervisionSummaryResponse } from '@/features/supervision/api/getSupervisionSummary';

const GROUP_PROGRESS_PATH: Record<string, string | null> = {
  // ключи — строго в нижнем регистре, т.к. ниже мы делаем toLowerCase()
  'студент': 'Инструктор',
  'инструктор': 'Куратор',
  'куратор': 'Супервизор',
  'супервизор': null,
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

  const targetGroup =
    mode === 'EXAM' && g ? GROUP_PROGRESS_PATH[g] ?? null : null;

  // CEU: как и было (для цели "Супервизор" требуем CEU.supervision)
  const ceuReady =
    !!ceuSummary?.percent &&
    ceuSummary.percent.ethics >= 100 &&
    ceuSummary.percent.cultDiver >= 100 &&
    (targetGroup === 'Супервизор' ? ceuSummary.percent.supervision >= 100 : true) &&
    ceuSummary.percent.general >= 100;

  // 🧠 Supervision:
  // EXAM — требуем 100% по PRACTICE и 100% по SUPERVISION.
  // RENEWAL — суммарные (PRACTICE + SUPERVISION + SUPERVISOR) >= 2000.
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

  // Экзаменьская оплата (нужна только в EXAM)
  const examPaid = (payments ?? []).some((p) => p.type === 'EXAM_ACCESS' && p.status === 'PAID');

  // Причины выводим только в EXAM-режиме
  const reasons: string[] = [];
  if (mode === 'EXAM') {
    if (!ceuReady) reasons.push('Недостаточно CEU-баллов');
    if (!supervisionReady) reasons.push('Недостаточно часов супервизии');
    if (!documentsReady) reasons.push('Документы не подтверждены или не оплачены');
  }

  // ✅ Допуск
  const isEligible =
    mode === 'RENEWAL'
      ? ceuReady && documentsReady
      : ceuReady && supervisionReady && documentsReady;

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
