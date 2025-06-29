import { z } from 'zod';

export const documentReviewSchema = z.object({
  documents: z.array(
    z.object({
      fileId: z.string(),
      type: z.string(),
      comment: z.string().optional(),
    }),
  ),
});

export type DocumentReviewFormData = z.infer<typeof documentReviewSchema>;

