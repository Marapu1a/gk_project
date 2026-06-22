import { api } from '@/lib/axios';

export type ExternalSupervisorClaimStatus = 'PENDING' | 'APPROVED' | 'SETUP_COMPLETE' | 'REJECTED';

export type AssignedAdmin = {
  id: string;
  fullName: string;
  email: string;
};

export type ExternalSupervisorClaimRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  externalSupervisorClaimStatus: ExternalSupervisorClaimStatus;
  externalSupervisorClaimedAt: string | null;
  externalSupervisorClaimAssignedTo: string | null;
  assignedAdmin: AssignedAdmin | null;
  externalSupervisorClaimReviewedAt: string | null;
  externalSupervisorClaimReviewedBy: string | null;
};

export type ExternalSupervisorClaimsResponse = {
  total: number;
  page: number;
  perPage: number;
  users: ExternalSupervisorClaimRow[];
};

export async function getExternalSupervisorClaims(
  mode: 'active' | 'history',
  page = 1,
  perPage = 20,
) {
  const { data } = await api.get<ExternalSupervisorClaimsResponse>(
    '/admin/external-supervisor-claims',
    { params: { mode, page, perPage } },
  );
  return data;
}

export async function assignExternalSupervisorClaim(
  userId: string,
  action: 'assign' | 'unassign',
) {
  const { data } = await api.post(`/admin/external-supervisor-claims/${userId}/assign`, { action });
  return data;
}

export async function updateExternalSupervisorClaim(
  userId: string,
  status: 'APPROVED' | 'REJECTED' | 'SETUP_COMPLETE',
) {
  const { data } = await api.patch(`/admin/external-supervisor-claims/${userId}`, { status });
  return data;
}
