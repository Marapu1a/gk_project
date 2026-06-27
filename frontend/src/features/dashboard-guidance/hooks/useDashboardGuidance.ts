import type { CurrentUser } from '@/features/auth/api/me';
import { useQualificationProgress } from '@/features/certificate/hooks/useQualificationProgress';
import { useGetDocReviewReq } from '@/features/documentReview/hooks/useGetDocReviewReq';
import { useMyExamApp } from '@/features/exam/hooks/useMyExamApp';
import { useReviewerCandidates } from '@/features/supervision/hooks/useReviewerCandidates';
import { useReviewerRequests } from '@/features/supervision/hooks/useReviewerRequests';
import { resolveDashboardNextStep } from '../model/resolveDashboardNextStep';

type Options = {
  user: CurrentUser;
  hasCertificationAccess: boolean;
};

export function useDashboardGuidance({ user, hasCertificationAccess }: Options) {
  const activeGroupName = user.activeGroup?.name;
  const canReviewSupervision =
    activeGroupName === 'Супервизор' || activeGroupName === 'Опытный Супервизор';
  const canReviewMentorship = activeGroupName === 'Опытный Супервизор';
  const progress = useQualificationProgress(activeGroupName, user.targetLevel);
  const documentReview = useGetDocReviewReq();
  const examApplication = useMyExamApp();
  const candidates = useReviewerCandidates(50, canReviewSupervision);
  const supervisionRequests = useReviewerRequests(
    { kind: 'supervision', status: 'UNCONFIRMED', page: 1, limit: 1 },
    canReviewSupervision,
  );
  const mentorshipRequests = useReviewerRequests(
    { kind: 'mentorship', status: 'UNCONFIRMED', page: 1, limit: 1 },
    canReviewMentorship,
  );

  const reviewerLoading =
    canReviewSupervision &&
    (candidates.isLoading ||
      supervisionRequests.isLoading ||
      (canReviewMentorship && mentorshipRequests.isLoading));
  const isLoading =
    progress.loading || documentReview.isLoading || examApplication.isLoading || reviewerLoading;

  if (isLoading) return { step: null, isLoading: true };

  const documentBelongsToActiveCycle = Boolean(
    user.activeCycle?.id && documentReview.data?.cycleId === user.activeCycle.id,
  );
  const inheritedRenewalDocuments =
    user.activeCycle?.type === 'RENEWAL' && progress.documentsReady;

  const pendingRelations = [
    ...(candidates.data?.supervision ?? []),
    ...(canReviewMentorship ? (candidates.data?.mentorship ?? []) : []),
  ].filter((candidate) => candidate.status === 'PENDING').length;

  const isExperiencedSupervisor = activeGroupName === 'Опытный Супервизор';

  const step = resolveDashboardNextStep({
    externalSupervisorPending: user.externalSupervisorClaimStatus === 'PENDING',
    externalSupervisorApproved: user.externalSupervisorClaimStatus === 'APPROVED',
    hasTarget: Boolean(user.targetLevel),
    targetLevel: user.targetLevel,
    hasActiveCycle: Boolean(user.activeCycle),
    isRenewalCycle: user.activeCycle?.type === 'RENEWAL',
    hasCertificationAccess,
    documentStatus: inheritedRenewalDocuments
      ? 'CONFIRMED'
      : documentBelongsToActiveCycle
        ? (documentReview.data?.status ?? null)
        : null,
    hasDocumentRequest: documentBelongsToActiveCycle || inheritedRenewalDocuments,
    documentReviewPaid: progress.documentReviewPaid,
    documentsReady: progress.documentsReady,
    hoursReady: isExperiencedSupervisor || progress.supervisionReady,
    ceuReady: progress.ceuReady,
    requiredPaymentsPaid: progress.requiredPaymentsPaid,
    examStatus: examApplication.data?.status ?? null,
    reviewer: {
      pendingSupervisionRequests: supervisionRequests.data?.total ?? 0,
      pendingMentorshipRequests: mentorshipRequests.data?.total ?? 0,
      pendingRelations,
    },
  });

  return { step, isLoading: false };
}
