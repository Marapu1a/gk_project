// routes/groups.ts
import { FastifyInstance } from 'fastify';
import { updateUserGroupsHandler } from '../handlers/groups/updateUserGroupsHandler';
import { getUserGroupsHandler } from '../handlers/groups/getUserGroupsHandler';

import { verifyToken } from '../middlewares/verifyToken';

export async function groupsRoutes(app: FastifyInstance) {
  app.get('/admin/users/:id/groups', { preHandler: verifyToken }, getUserGroupsHandler);
  app.post('/admin/users/:id/groups', { preHandler: verifyToken }, updateUserGroupsHandler);
}
