import { z } from 'zod';

export const createSupervisionContractSchema = z.object({
  uploadedFileId: z.string().min(1),
  supervisorInput: z.string().trim().min(1).max(240),
  supervisorId: z.string().optional(),
});

