import { useMutation } from '@tanstack/react-query';
import { createFullBackup } from '../api/createFullBackup';

export function useCreateFullBackup() {
  return useMutation({ mutationFn: createFullBackup });
}
