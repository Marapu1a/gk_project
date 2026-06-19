import { api } from '@/lib/axios';

export type ExternalSupervisorClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ExternalSupervisorClaimRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  externalSupervisorClaimStatus: ExternalSupervisorClaimStatus;
  externalSupervisorClaimedAt: string | null;
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

export async function updateExternalSupervisorClaim(
  userId: string,
  status: 'APPROVED' | 'REJECTED',
) {
  const { data } = await api.patch(`/admin/external-supervisor-claims/${userId}`, { status });
  return data;
}
