// src/hooks/useRegisterMutation.ts
import { useMutation } from '@tanstack/react-query'
import { register } from '@/api/auth'
import type { RegisterData, RegisterResponse } from '@/api/auth'


export const useRegisterMutation = () => {
  return useMutation<RegisterResponse, Error, RegisterData>({
    mutationFn: register,
  })
}
