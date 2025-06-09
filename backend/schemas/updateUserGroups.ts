// schemas/admin/updateUserGroups.ts
import { z } from 'zod';

export const updateUserGroupsSchema = z.object({
  groupIds: z.array(z.string().cuid()),
});
