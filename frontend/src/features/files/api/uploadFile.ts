import { api } from '@/lib/axios';

export async function uploadFile(file: File, category: string, targetUserId?: string) {
  const formData = new FormData();
  formData.append('file', file);

  const params = new URLSearchParams({ category });
  if (targetUserId) params.set('targetUserId', targetUserId);

  const response = await api.post(`/upload?${params.toString()}`, formData);
  return response.data; // UploadedFile
}
