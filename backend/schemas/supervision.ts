import { z } from 'zod'

export const supervisionRequestSchema = z.object({
  supervisorEmail: z.string().email(),
  hoursInstructor: z.number().min(0),
  hoursCurator: z.number().min(0),
  hoursSupervisor: z.number().min(0),
})
