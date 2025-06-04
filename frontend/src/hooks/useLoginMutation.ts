import { useMutation } from '@tanstack/react-query'
import { login } from '@/api/auth'
import type { LoginData, LoginResponse } from '@/api/auth'

export const useLoginMutation = () => {
  return useMutation<LoginResponse, Error, LoginData>({
    mutationFn: login,
  })
}
