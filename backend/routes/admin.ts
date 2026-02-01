// /routes/admin.ts
import { FastifyInstance } from 'fastify';
import { toggleUserRoleHandler } from '../handlers/admin/userRoleHandler';
import { getUsersHandler } from '../handlers/admin/getUsersHandler';
import { getUserFullDetailsHandler } from '../handlers/admin/getUserDetailsHandler';
import { updateUserBasicInfoHandler } from '../handlers/admin/updateUserBasicInfo';
import { updatePaymentHandler } from '../handlers/admin/updatePayment';
import { getUserExportHandler } from '../handlers/admin/getUserExportHandler';
import { updateUserPasswordAdminHandler } from '../handlers/admin/updateUserPasswordAdminHandler';
import { getUsersExportXlsxHandler } from "../handlers/admin/getUsersExportXlsxHandler";

// CEU god-mode
import { getUserCEUMatrixAdminHandler } from '../handlers/admin/ceu/getUserCEUMatrixAdminHandler';
import { updateUserCEUMatrixAdminHandler } from '../handlers/admin/ceu/updateUserCEUMatrixAdminHandler';

// Supervision god-mode
import { getUserSupervisionMatrixAdminHandler } from '../handlers/admin/supervision/getUserSupervisionMatrixAdminHandler';
import { updateUserSupervisionMatrixAdminHandler } from '../handlers/admin/supervision/updateUserSupervisionMatrixAdminHandler';

import { verifyToken } from '../middlewares/verifyToken';

// импорт целевого уровня
import { updateTargetLevelHandler } from '../handlers/admin/updateTargetLevel';

export async function usersRoutes(app: FastifyInstance) {
  app.patch('/admin/users/:id/role', { preHandler: verifyToken }, toggleUserRoleHandler);
  app.get('/admin/users/:id/details', { preHandler: verifyToken }, getUserFullDetailsHandler);
  app.get('/admin/users', { preHandler: verifyToken }, getUsersHandler);
  app.patch('/admin/users/:id', { preHandler: verifyToken }, updateUserBasicInfoHandler);

  // Добавлен новый маршрут для таргет-левела
  app.patch('/admin/users/:id/target-level', { preHandler: verifyToken }, updateTargetLevelHandler);

  // Supervision (admin-only)
  app.get('/admin/supervision/:userId/matrix', { preHandler: verifyToken }, getUserSupervisionMatrixAdminHandler);
  app.patch('/admin/supervision/:userId/matrix', { preHandler: verifyToken }, updateUserSupervisionMatrixAdminHandler);

  // Payments
  app.patch('/admin/payment/:id', { preHandler: verifyToken }, updatePaymentHandler);

  // CEU (admin-only)
  app.get('/admin/ceu/:userId/matrix', { preHandler: verifyToken }, getUserCEUMatrixAdminHandler);
  app.get('/admin/users/:id/export', { preHandler: verifyToken }, getUserExportHandler);
  app.patch('/admin/ceu/:userId/matrix', { preHandler: verifyToken }, updateUserCEUMatrixAdminHandler);

  // Users
  app.patch('/admin/users/:id/password', { preHandler: verifyToken }, updateUserPasswordAdminHandler);

  // Exel export
  app.get("/admin/users/export.xlsx", { preHandler: verifyToken }, getUsersExportXlsxHandler);
}
