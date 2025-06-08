import { useQuery } from '@tanstack/react-query'
import { getMyCeu } from '@/api/ceu'
import { useAuth } from '@/contexts/AuthContext'

export const useMyCeu = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: ['my-ceu'],
    queryFn: getMyCeu,
    enabled: !!token,
  })
}
