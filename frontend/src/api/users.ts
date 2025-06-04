import { api } from './axios'

export const getCurrentUser = async () => {
  const res = await api.get('/users/me')
  return res.data // { id, email, role, fullName }
}

export const getSupervisionSummary = async () => {
  const res = await api.get('/supervision-hours/summary')
  return res.data // { hoursInstructor, hoursCurator, hoursSupervisor }
}
