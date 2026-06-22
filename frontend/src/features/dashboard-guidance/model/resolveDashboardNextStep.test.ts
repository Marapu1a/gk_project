import { describe, expect, it } from 'vitest';
import { resolveDashboardNextStep } from './resolveDashboardNextStep';
import type { DashboardGuidanceContext } from './types';

const readyContext: DashboardGuidanceContext = {
  externalSupervisorPending: false,
  hasTarget: true,
  hasActiveCycle: true,
  isRenewalCycle: false,
  hasCertificationAccess: true,
  documentStatus: 'CONFIRMED',
  hasDocumentRequest: true,
  documentReviewPaid: true,
  documentsReady: true,
  hoursReady: true,
  ceuReady: true,
  requiredPaymentsPaid: true,
  examStatus: 'NOT_SUBMITTED',
  reviewer: {
    pendingSupervisionRequests: 0,
    pendingMentorshipRequests: 0,
    pendingRelations: 0,
  },
};

describe('resolveDashboardNextStep', () => {
  it('blocks certification prompts while an external supervisor claim is pending', () => {
    const step = resolveDashboardNextStep({
      ...readyContext,
      externalSupervisorPending: true,
      hasTarget: false,
      hasActiveCycle: false,
    });

    expect(step.id).toBe('external-supervisor');
    expect(step.action).toBeUndefined();
  });

  it('prioritizes reviewer work over the reviewer own certification', () => {
    const step = resolveDashboardNextStep({
      ...readyContext,
      hoursReady: false,
      reviewer: {
        ...readyContext.reviewer,
        pendingSupervisionRequests: 2,
      },
    });

    expect(step.id).toBe('reviewer-requests');
  });

  it('allows parallel progress while paid documents are under review', () => {
    const step = resolveDashboardNextStep({
      ...readyContext,
      documentStatus: 'UNCONFIRMED',
      documentsReady: false,
      hoursReady: false,
    });

    expect(step.id).toBe('hours');
  });

  it('waits for document review only after other requirements are complete', () => {
    const step = resolveDashboardNextStep({
      ...readyContext,
      documentStatus: 'UNCONFIRMED',
      documentsReady: false,
    });

    expect(step.id).toBe('documents-pending');
  });

  it('directs a ready user to the exam application', () => {
    expect(resolveDashboardNextStep(readyContext).id).toBe('exam-ready');
  });

  it('does not ask to select a target again when only the active cycle is missing', () => {
    const step = resolveDashboardNextStep({ ...readyContext, hasActiveCycle: false });
    expect(step.id).toBe('cycle-missing');
    expect(step.action).toBeUndefined();
  });

  it('does not request a separate document review payment for renewal', () => {
    const step = resolveDashboardNextStep({
      ...readyContext,
      isRenewalCycle: true,
      documentReviewPaid: false,
      hoursReady: false,
    });

    expect(step.id).toBe('hours');
  });

  it('directs an experienced supervisor to CEU when hours are satisfied', () => {
    // Experienced supervisors have no hour requirements; the adapter passes hoursReady: true
    const step = resolveDashboardNextStep({
      ...readyContext,
      isRenewalCycle: true,
      hoursReady: true,
      ceuReady: false,
    });

    expect(step.id).toBe('ceu');
  });
});
