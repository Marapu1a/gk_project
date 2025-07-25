import { api } from '@/lib/axios';

export async function uploadFile(file: File, category: string) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(`/upload?category=${category}`, formData);
  return response.data; // UploadedFile
}
