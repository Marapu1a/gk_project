import { api } from '@/lib/axios';
import type { UploadedFile } from '@/utils/FileUpload';

export async function getUploadedFiles(): Promise<UploadedFile[]> {
  const response = await api.get('/uploads');
  return response.data;
}
