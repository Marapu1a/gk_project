import type { ExamStatus } from '@/features/exam/api/getMyExamApp';

export type GuidanceAction =
  | { type: 'route'; target: string; label: string }
  | { type: 'section'; target: string; label: string };

export type GuidanceTone = 'info' | 'attention' | 'success';

export type DashboardGuidanceStep = {
  id: string;
  tone: GuidanceTone;
  title: string;
  description: string;
  action?: GuidanceAction;
};

export type DashboardGuidanceContext = {
  externalSupervisorPending: boolean;
  externalSupervisorApproved: boolean;
  hasTarget: boolean;
  hasActiveCycle: boolean;
  isRenewalCycle: boolean;
  hasCertificationAccess: boolean;
  documentStatus: string | null;
  hasDocumentRequest: boolean;
  documentReviewPaid: boolean;
  documentsReady: boolean;
  hoursReady: boolean;
  ceuReady: boolean;
  requiredPaymentsPaid: boolean;
  examStatus: ExamStatus | null;
  reviewer: {
    pendingSupervisionRequests: number;
    pendingMentorshipRequests: number;
    pendingRelations: number;
  };
};
