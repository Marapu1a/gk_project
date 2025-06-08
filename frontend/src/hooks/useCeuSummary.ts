import { useQuery } from '@tanstack/react-query'
import { getCeuSummary } from '@/api/ceu'
import { useAuth } from '@/contexts/AuthContext'

export const useCeuSummary = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: ['ceu-summary'],
    queryFn: getCeuSummary,
    enabled: !!token,
  })
}
