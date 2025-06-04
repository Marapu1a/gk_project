import { useQuery } from '@tanstack/react-query'
import { getSupervisionSummary } from '@/api/users'
import { useAuth } from '@/contexts/AuthContext'

export const useSupervisionSummary = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: ['supervision-summary'],
    queryFn: getSupervisionSummary,
    enabled: !!token,
  })
}
