// /routes/admin.ts
import { FastifyInstance } from 'fastify';
import { toggleUserRoleHandler } from '../handlers/admin/userRoleHandler';
import { getUsersHandler } from '../handlers/admin/getUsersHandler';
import { getUserDetailsHandler } from '../handlers/admin/getUserDetailsHandler';

import { verifyToken } from '../middlewares/verifyToken';

export async function usersRoutes(app: FastifyInstance) {
  app.patch('/admin/users/:id/role', { preHandler: verifyToken }, toggleUserRoleHandler);
  app.get('/admin/users/:id/details', { preHandler: verifyToken }, getUserDetailsHandler);
  app.get('/admin/users', { preHandler: verifyToken }, getUsersHandler);
}
