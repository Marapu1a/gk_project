// routes/groups.ts
import { FastifyInstance } from 'fastify';
import { updateUserGroupsHandler } from '../handlers/groups/updateUserGroupsHandler';
// import { getUserGroupsHandler } from '../handlers/groups/getUserGroupsHandler'; // ← больше не нужен
import { getUserGroupsByEmailHandler } from '../handlers/groups/getUserGroupsByEmailHandler';
import { getUserGroupsByIdHandler } from '../handlers/groups/getUserGroupsByIdHandler';
import { searchUsersHandler } from '../handlers/groups/searchUsersHandler';

import { verifyToken } from '../middlewares/verifyToken';

export async function groupsRoutes(app: FastifyInstance) {
  // по userId
  app.get('/admin/users/:id/groups', { preHandler: verifyToken }, getUserGroupsByIdHandler);
  app.post('/admin/users/:id/groups', { preHandler: verifyToken }, updateUserGroupsHandler);

  // по email (нужно для старого поиска/формы)
  app.get('/admin/users/by-email/:email/groups', { preHandler: verifyToken }, getUserGroupsByEmailHandler);

  // подсказки для поиска
  app.get('/admin/users/search', { preHandler: verifyToken }, searchUsersHandler);
}
