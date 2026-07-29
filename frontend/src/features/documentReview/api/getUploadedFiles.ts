import { api } from '@/lib/axios';

export async function getUploadedFiles(options?: {
  category?: string;
  pending?: boolean;
}) {
  const res = await api.get('/uploads', {
    params: {
      category: options?.category,
      pending: options?.pending ? 'true' : undefined,
    },
  });
  return res.data;
}
