import { api } from '@/lib/axios';

export type SupervisionContract = {
  id: string;
  supervisorInput: string;
  supervisorEmail: string | null;
  supervisorName: string | null;
  status: 'UNCONFIRMED' | 'CONFIRMED' | 'REJECTED' | 'SPENT';
  createdAt: string;
  file: {
    id: string;
    fileId: string;
    name: string;
    mimeType: string;
  };
  supervisor: {
    id: string;
    email: string;
    fullName: string | null;
  } | null;
};

export async function getSupervisionContracts(): Promise<SupervisionContract[]> {
  const { data } = await api.get<{ contracts: SupervisionContract[] }>('/supervision/contracts');
  return data.contracts;
}

export async function createSupervisionContract(input: {
  uploadedFileId: string;
  supervisorInput: string;
  supervisorId?: string;
}): Promise<SupervisionContract> {
  const { data } = await api.post<{ success: true; contract: SupervisionContract }>(
    '/supervision/contracts',
    input,
  );
  return data.contract;
}

export async function deleteSupervisionContract(id: string): Promise<{ success: true }> {
  const { data } = await api.delete<{ success: true }>(`/supervision/contracts/${id}`);
  return data;
}
