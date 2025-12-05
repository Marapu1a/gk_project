import { api } from '@/lib/axios';

export async function getUserDetails(id: string) {
  const response = await api.get(`/admin/users/${id}/details`);
  return response.data as {
    id: string;
    email: string;
    fullName: string;
    fullNameLatin: string | null;
    phone: string | null;
    birthDate: string | null;
    country: string | null;
    city: string | null;
    avatarUrl: string | null;
    isEmailConfirmed: boolean;
    role: 'ADMIN' | 'REVIEWER' | 'STUDENT';
    createdAt: string;
    targetLevel: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | null;
    targetLockRank: number | null;

    groups: { id: string; name: string; rank: number }[];

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
      status: string;
      comment: string | null;
      createdAt: string;
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
