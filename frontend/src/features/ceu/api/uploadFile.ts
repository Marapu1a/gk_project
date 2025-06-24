import { api } from '@/lib/axios';

export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/upload', formData);

  return response.data.fileId;
}
