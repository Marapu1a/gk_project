// api/ceu.ts
import { api } from './axios'

export type CeuCategoryStats = {
  ethics: number
  cultDiver: number
  general: number
}

export type SupervisionStats = {
  instructor: number
  curator: number
  supervisor: number
}

export type CeuSummaryResponse = {
  required: CeuCategoryStats | null
  percent: CeuCategoryStats | null
  usable: CeuCategoryStats
  total: CeuCategoryStats
  supervisionRequired: SupervisionStats
  supervisionActual: SupervisionStats
}

export type CeuRecord = {
  id: string
  eventName: string
  eventDate: string
  ceu_ethics: number
  ceu_cult_diver: number
  ceu_superv: number
  ceu_general: number
  is_valid: boolean
  spentOnCertificate: boolean
}

export type MyCeuResponse = {
  total: {
    ethics: number
    cultDiver: number
    supervision: number
    general: number
  }
  records: CeuRecord[]
}


export const getCeuSummary = async (): Promise<CeuSummaryResponse> => {
  const { data } = await api.get('/ceu/summary')
  return data
}

export const getMyCeu = async (): Promise<MyCeuResponse> => {
  const { data } = await api.get('/ceu/my')
  return data
}
