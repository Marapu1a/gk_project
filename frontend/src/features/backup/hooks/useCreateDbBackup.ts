import { useMutation } from '@tanstack/react-query';
import { createDbBackup } from '../api/createDbBackup';

export function useCreateDbBackup() {
  return useMutation({ mutationFn: createDbBackup });
}
