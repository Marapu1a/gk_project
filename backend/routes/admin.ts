// /routes/admin.ts
import { FastifyInstance } from 'fastify';
import { toggleUserRoleHandler } from '../handlers/admin/userRoleHandler';
import { getUsersHandler } from '../handlers/admin/getUsersHandler';
import { getUserFullDetailsHandler } from '../handlers/admin/getUserDetailsHandler';
import { updateUserBasicInfoHandler } from '../handlers/admin/updateUserBasicInfo';
import { updateCEUEntryHandler } from '../handlers/admin/updateCEUEntry';
import { updateSupervisionHourHandler } from '../handlers/admin/updateSupervisionHour';
import { updatePaymentHandler } from '../handlers/admin/updatePayment';

import { verifyToken } from '../middlewares/verifyToken';

export async function usersRoutes(app: FastifyInstance) {
  app.patch('/admin/users/:id/role', { preHandler: verifyToken }, toggleUserRoleHandler);
  app.get('/admin/users/:id/details', { preHandler: verifyToken }, getUserFullDetailsHandler);
  app.get('/admin/users', { preHandler: verifyToken }, getUsersHandler);
  app.patch('/admin/users/:id', { preHandler: verifyToken }, updateUserBasicInfoHandler);
  app.patch('/admin/ceu-entry/:id', { preHandler: verifyToken }, updateCEUEntryHandler);
  app.patch('/admin/supervision-hour/:id', { preHandler: verifyToken }, updateSupervisionHourHandler);
  app.patch('/admin/payment/:id', { preHandler: verifyToken }, updatePaymentHandler);
}
