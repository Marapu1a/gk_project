import { DASHBOARD_GUIDANCE_MESSAGES as M } from './messages';
import type { DashboardGuidanceContext, DashboardGuidanceStep } from './types';

const section = (target: string, label: string) => ({ type: 'section' as const, target, label });
const route = (target: string, label: string) => ({ type: 'route' as const, target, label });

export function resolveDashboardNextStep(
  context: DashboardGuidanceContext,
): DashboardGuidanceStep {
  const pendingReviewCount =
    context.reviewer.pendingSupervisionRequests + context.reviewer.pendingMentorshipRequests;

  if (context.externalSupervisorPending) {
    return { id: 'external-supervisor', tone: 'info', ...M.externalSupervisor };
  }

  if (context.externalSupervisorApproved && !context.hasTarget) {
    return { id: 'external-supervisor-approved', tone: 'success', ...M.externalSupervisorApproved };
  }

  if (pendingReviewCount > 0) {
    const onlyMentorship =
      context.reviewer.pendingMentorshipRequests > 0 &&
      context.reviewer.pendingSupervisionRequests === 0;
    const target = onlyMentorship
      ? '/reviewer/candidates/mentorship?status=UNCONFIRMED'
      : '/reviewer/candidates/supervision?status=UNCONFIRMED';
    return {
      id: 'reviewer-requests',
      tone: 'attention',
      title: M.reviewerRequests.title,
      description: M.reviewerRequests.description(pendingReviewCount),
      action: route(target, 'Перейти к проверке'),
    };
  }

  if (context.reviewer.pendingRelations > 0) {
    return {
      id: 'reviewer-relations',
      tone: 'attention',
      title: M.reviewerRelations.title,
      description: M.reviewerRelations.description(context.reviewer.pendingRelations),
      action: section('dashboard-reviewer-work', 'Открыть кандидатов'),
    };
  }

  if (!context.hasTarget) {
    return {
      id: 'target',
      tone: 'attention',
      ...M.target,
      action: section('dashboard-certification', 'Выбрать уровень'),
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
      action: route('/document-review', 'Перейти к документам'),
    };
  }

  if (context.documentStatus === 'REJECTED' || context.documentStatus === 'PARTIALLY_CONFIRMED') {
    return {
      id: 'documents-correction',
      tone: 'attention',
      ...M.documentsCorrection,
      action: route('/document-review', 'Открыть документы'),
    };
  }

  if (!context.isRenewalCycle && !context.documentReviewPaid) {
    return {
      id: 'document-payment',
      tone: 'attention',
      ...M.documentPayment,
    };
  }

  if (!context.hoursReady) {
    return {
      id: 'hours',
      tone: 'info',
      ...M.hours,
      action: route('/supervision/hours', 'Перейти к часам'),
    };
  }

  if (!context.ceuReady) {
    return {
      id: 'ceu',
      tone: 'info',
      ...M.ceu,
      action: route('/ceu/points', 'Перейти к CEU'),
    };
  }

  if (!context.requiredPaymentsPaid) {
    return {
      id: 'payments',
      tone: 'attention',
      ...M.payments,
    };
  }

  if (!context.documentsReady) {
    return { id: 'documents-pending', tone: 'info', ...M.documentsPending };
  }

  if (context.examStatus === 'PENDING') {
    return { id: 'exam-pending', tone: 'info', ...M.examPending };
  }

  if (context.examStatus === 'APPROVED') {
    return { id: 'exam-approved', tone: 'success', ...M.examApproved };
  }

  if (context.examStatus === 'REJECTED') {
    return {
      id: 'exam-rejected',
      tone: 'attention',
      ...M.examRejected,
      action: section('dashboard-certification', 'Открыть заявку'),
    };
  }

  return {
    id: 'exam-ready',
    tone: 'success',
    ...M.examReady,
    action: section('dashboard-certification', 'Подать заявку'),
  };
}
