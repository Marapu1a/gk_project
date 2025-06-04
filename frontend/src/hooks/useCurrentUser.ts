import { useQuery } from '@tanstack/react-query'
import { getCurrentUser } from '@/api/users'
import { useAuth } from '@/contexts/AuthContext'

export const useCurrentUser = () => {
  const { token } = useAuth()

  return useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
    enabled: !!token,
  })
}
