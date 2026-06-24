import { api } from '@/lib/axios';

export async function getUserDetails(id: string) {
  const response = await api.get(`/admin/users/${id}/details`);
  return response.data as {
    id: string;
    email: string;
    registrationNumber: string | null;
    fullName: string;
    fullNameLatin: string | null;
    phone: string | null;
    birthDate: string | null;
    country: string | null;
    city: string | null;
    avatarUrl: string | null;
    ibaoId: string | null;
    isProfileVisible: boolean;
    isEmailConfirmed: boolean;
    role: 'ADMIN' | 'REVIEWER' | 'STUDENT';
    createdAt: string;
    archivedAt: string | null;
    archivedById: string | null;
    archiveReason: string | null;
    archiveRequestedAt: string | null;
    archiveRequestReason: string | null;
    externalSupervisorClaimStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
    externalSupervisorClaimedAt: string | null;
    externalSupervisorClaimReviewedAt: string | null;
    externalSupervisorClaimReviewedBy: string | null;

    targetLevel: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null;
    targetLockRank: number | null;

    activeCycle: {
      id: string;
      type: 'CERTIFICATION' | 'RENEWAL';
      status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
      targetLevel: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';
      startedAt: string;
      endedAt: string | null;
    } | null;

    activeCycleExamApplication: {
      id: string;
      cycleId: string | null;
      status: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
      createdAt: string;
      updatedAt: string;
      cycle: {
        id: string;
        type: 'CERTIFICATION' | 'RENEWAL';
        status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
        targetLevel: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';
        startedAt: string;
      } | null;
    } | null;

    examReadiness: {
      ready: boolean;
      missing: string[];
      ceu: {
        ready: boolean;
        current: { ethics: number; cultDiver: number; supervision: number; general: number; total: number };
        required: { ethics: number; cultDiver: number; supervision: number; general: number; total: number } | null;
      };
      supervision: {
        ready: boolean;
        current: { practice: number; supervision: number; mentor: number };
        required: { practice: number; supervision: number; supervisor: number } | null;
      };
      documents: {
        ready: boolean;
        request: {
          id: string;
          status: string;
          submittedAt: string;
          reviewedAt: string | null;
          adminUrl: string;
        } | null;
      };
      payments: {
        ready: boolean;
        items: {
          type: string;
          label: string;
          paid: boolean;
          requestedAt: string | null;
          confirmedAt: string | null;
        }[];
      };
    } | null;

    latestCertificate: {
      id: string;
      number: string;
      title: string;
      issuedAt: string;
      expiresAt: string | null;
      isRenewal: boolean;
      comment: string | null;
      file: { fileId: string; name: string } | null;
      group: { id: string; name: string };
      confirmedBy: { email: string; fullName: string } | null;
    } | null;

    groups: { id: string; name: string; rank: number }[];

    reviewerCandidateRelations: {
      id: string;
      kind: 'SUPERVISION' | 'MENTORSHIP';
      status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
      createdAt: string;
      updatedAt: string;
      candidate: {
        id: string;
        email: string;
        fullName: string | null;
      };
      cycle: {
        id: string;
        targetLevel: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR';
        startedAt: string;
      };
    }[];

    reviewerWorkload: {
      supervisionPendingRequests: number;
      mentorshipPendingRequests: number;
    };

    certificates: {
      id: string;
      number: string;
      title: string;
      issuedAt: string;
      expiresAt: string | null;
      isRenewal: boolean;
      comment: string | null;
      file: { fileId: string; name: string } | null;
      group: { id: string; name: string };
      confirmedBy: { email: string; fullName: string } | null;
    }[];

    payments: {
      id: string;
      type: string;
      targetLevel: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null;
      status: string;
      comment: string | null;
      createdAt: string;
      requestedAt: string | null;
      confirmedAt: string | null;
    }[];

    ceuRecords: {
      id: string;
      eventName: string;
      eventDate: string;
      fileId: string | null;
      entries: {
        id: string;
        category: string;
        value: number;
        status: string;
        reviewedAt: string | null;
        rejectedReason: string | null;
        reviewer: { email: string; fullName: string } | null;
      }[];
    }[];

    supervisionRecords: {
      id: string;
      cycleId: string | null;
      fileId: string | null;
      createdAt: string;
      hours: {
        id: string;
        type: string;
        value: number;
        status: string;
        reviewedAt: string | null;
        rejectedReason: string | null;
        reviewer: { email: string; fullName: string } | null;
      }[];
    }[];

    uploadedFiles: {
      id: string;
      fileId: string;
      name: string;
      mimeType: string;
      type: string;
      comment: string | null;
      createdAt: string;
      certificate: {
        title: string;
        number: string;
        issuedAt: string;
        expiresAt: string | null;
      } | null;
    }[];

    documentReviewRequests: {
      id: string;
      status: string;
      paid: boolean;
      reviewerEmail: string | null;
      submittedAt: string;
      reviewedAt: string | null;
      comment: string | null;
      documents: { fileId: string; name: string }[];
    }[];
  };
}
