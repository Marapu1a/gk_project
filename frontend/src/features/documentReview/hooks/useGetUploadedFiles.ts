import { useQuery } from '@tanstack/react-query';
import { getUploadedFiles } from '../api/getUploadedFiles';

export function useGetUploadedFiles() {
  return useQuery({
    queryKey: ['uploadedFiles'],
    queryFn: getUploadedFiles,
  });
}
