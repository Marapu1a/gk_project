import { z } from 'zod'

export const supervisionRequestSchema = z.object({
  supervisorEmail: z.string().email(),
  hoursInstructor: z.number().min(0),
  hoursCurator: z.number().min(0),
  hoursSupervisor: z.number().min(0),
})

export const updateSupervisionStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  approvedHoursInstructor: z.number().min(0).optional(),
  approvedHoursCurator: z.number().min(0).optional(),
  approvedHoursSupervisor: z.number().min(0).optional(),
})
