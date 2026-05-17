import { useMutation } from '@tanstack/react-query';
import { requestProfileArchive } from '../api/requestProfileArchive';

export function useRequestProfileArchive() {
  return useMutation({
    mutationFn: (reason?: string) => requestProfileArchive(reason),
  });
}
