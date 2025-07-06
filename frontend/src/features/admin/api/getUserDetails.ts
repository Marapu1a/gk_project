import { api } from '@/lib/axios';

export type UserDetailsResponse = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
  groups: { id: string; name: string }[];
  certificates: {
    id: string;
    number: string;
    title: string;
    fileUrl: string;
    issuedAt: string;
    expiresAt: string;
  }[];
  ceuRecords: {
    id: string;
    eventName: string;
    eventDate: string;
    fileId: string;
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
    createdAt: string;
  }[];
};

export async function getUserDetails(userId: string) {
  const response = await api.get(`/admin/users/${userId}/details`);
  return response.data as UserDetailsResponse;
}
