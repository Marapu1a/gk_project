import { DASHBOARD_GUIDANCE_MESSAGES as M } from './messages';
import type { DashboardGuidanceContext, DashboardGuidanceStep } from './types';

export function resolveDashboardNextStep(
  context: DashboardGuidanceContext,
): DashboardGuidanceStep | null {
  const pendingReviewCount =
    context.reviewer.pendingSupervisionRequests + context.reviewer.pendingMentorshipRequests;
  const isSupervisorRenewal = context.isRenewalCycle && context.targetLevel === 'SUPERVISOR';

  if (context.externalSupervisorPending) {
    return { id: 'external-supervisor', tone: 'info', ...M.externalSupervisor };
  }

  if (context.externalSupervisorApproved && !context.hasTarget) {
    return { id: 'external-supervisor-approved', tone: 'success', ...M.externalSupervisorApproved };
  }

  if (pendingReviewCount > 0) {
    return {
      id: 'reviewer-requests',
      tone: 'attention',
      title: M.reviewerRequests.title,
      description: M.reviewerRequests.description(pendingReviewCount),
    };
  }

  if (context.reviewer.pendingRelations > 0) {
    return {
      id: 'reviewer-relations',
      tone: 'attention',
      title: M.reviewerRelations.title,
      description: M.reviewerRelations.description(context.reviewer.pendingRelations),
    };
  }

  if (!context.hasTarget) {
    return {
      id: 'target',
      tone: 'attention',
      ...M.target,
    };
  }

  if (!context.hasActiveCycle) {
    return { id: 'cycle-missing', tone: 'attention', ...M.cycleMissing };
  }

  if (!context.hasCertificationAccess) {
    return {
      id: 'certification-payment',
      tone: 'attention',
      ...M.certificationPayment,
    };
  }

  if (!context.hasDocumentRequest) {
    return {
      id: 'documents-upload',
      tone: 'attention',
      ...M.documentsUpload,
    };
  }

  if (context.documentStatus === 'REJECTED' || context.documentStatus === 'PARTIALLY_CONFIRMED') {
    return {
      id: 'documents-correction',
      tone: 'attention',
      ...M.documentsCorrection,
    };
  }

  if (!context.isRenewalCycle && !context.documentReviewPaid) {
    return {
      id: 'document-payment',
      tone: 'attention',
      ...M.documentPayment,
    };
  }

  if (!context.hoursReady && !context.ceuReady) {
    return {
      id: 'hours-and-ceu',
      tone: 'info',
      ...M.hoursAndCeu,
    };
  }

  if (!context.hoursReady) {
    return {
      id: 'hours',
      tone: 'info',
      ...M.hours,
    };
  }

  if (!context.ceuReady) {
    return {
      id: 'ceu',
      tone: 'info',
      ...M.ceu,
    };
  }

  if (!context.requiredPaymentsPaid) {
    return null;
  }

  if (!context.documentsReady) {
    return { id: 'documents-pending', tone: 'info', ...M.documentsPending };
  }

  if (context.examStatus === 'PENDING') {
    return isSupervisorRenewal
      ? { id: 'renewal-certificate-pending', tone: 'info', ...M.renewalCertificatePending }
      : { id: 'exam-pending', tone: 'info', ...M.examPending };
  }

  if (context.examStatus === 'APPROVED') {
    return isSupervisorRenewal
      ? { id: 'renewal-certificate-approved', tone: 'success', ...M.renewalCertificateApproved }
      : { id: 'exam-approved', tone: 'success', ...M.examApproved };
  }

  if (context.examStatus === 'REJECTED') {
    if (isSupervisorRenewal) {
      return {
        id: 'renewal-certificate-rejected',
        tone: 'attention',
        ...M.renewalCertificateRejected,
      };
    }

    return {
      id: 'exam-rejected',
      tone: 'attention',
      ...M.examRejected,
    };
  }

  if (isSupervisorRenewal) {
    return {
      id: 'renewal-certificate-ready',
      tone: 'success',
      ...M.renewalCertificateReady,
    };
  }

  return {
    id: 'exam-ready',
    tone: 'success',
    ...M.examReady,
    action: {
      type: 'section',
      target: 'dashboard-certification',
      label: 'Подать заявку',
    },
  };
}
