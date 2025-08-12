// /routes/admin.ts
import { FastifyInstance } from 'fastify';
import { toggleUserRoleHandler } from '../handlers/admin/userRoleHandler';
import { getUsersHandler } from '../handlers/admin/getUsersHandler';
import { getUserFullDetailsHandler } from '../handlers/admin/getUserDetailsHandler';
import { updateUserBasicInfoHandler } from '../handlers/admin/updateUserBasicInfo';
import { updateSupervisionHourHandler } from '../handlers/admin/supervision/updateSupervisionHour';
import { updatePaymentHandler } from '../handlers/admin/updatePayment';
import { updateCeuEntryValueHandler } from '../handlers/admin/ceu/updateCeuEntryValueHandler';

import { verifyToken } from '../middlewares/verifyToken';

export async function usersRoutes(app: FastifyInstance) {
  app.patch('/admin/users/:id/role', { preHandler: verifyToken }, toggleUserRoleHandler);
  app.get('/admin/users/:id/details', { preHandler: verifyToken }, getUserFullDetailsHandler);
  app.get('/admin/users', { preHandler: verifyToken }, getUsersHandler);
  app.patch('/admin/users/:id', { preHandler: verifyToken }, updateUserBasicInfoHandler);
  app.patch('/admin/supervision-hour/:id', { preHandler: verifyToken }, updateSupervisionHourHandler);
  app.patch('/admin/payment/:id', { preHandler: verifyToken }, updatePaymentHandler);
  app.patch('/admin/ceu/entries/:entryId', { preHandler: verifyToken }, updateCeuEntryValueHandler);
}
