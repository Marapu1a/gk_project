// /routes/admin.ts
import { FastifyInstance } from 'fastify';
import { toggleUserRoleHandler } from '../handlers/admin/userRoleHandler';
import { getUsersHandler } from '../handlers/admin/getUsersHandler';
import { getUserFullDetailsHandler } from '../handlers/admin/getUserDetailsHandler';
import { updateUserBasicInfoHandler } from '../handlers/admin/updateUserBasicInfo';
import { getUserExportHandler } from '../handlers/admin/getUserExportHandler';
import { updateUserPasswordAdminHandler } from '../handlers/admin/updateUserPasswordAdminHandler';
import { getUsersExportXlsxHandler } from "../handlers/admin/getUsersExportXlsxHandler";
import { updateUserVisibilityHandler } from '../handlers/admin/updateUserVisibility';
import { archiveUserHandler, restoreUserHandler } from '../handlers/admin/archiveUserHandler';
import { getUserActionLogHandler } from '../handlers/admin/getUserActionLogHandler';

// CEU god-mode
import { getUserCEUMatrixAdminHandler } from '../handlers/admin/ceu/getUserCEUMatrixAdminHandler';
import { updateUserCEUMatrixAdminHandler } from '../handlers/admin/ceu/updateUserCEUMatrixAdminHandler';
import {
  getCEUHistoryAdminExportHandler,
  getCEUHistoryAdminHandler,
} from '../handlers/admin/ceu/getCEUHistoryAdminHandler';

// Supervision god-mode
import { getUserSupervisionMatrixAdminHandler } from '../handlers/admin/supervision/getUserSupervisionMatrixAdminHandler';
import { updateUserSupervisionMatrixAdminHandler } from '../handlers/admin/supervision/updateUserSupervisionMatrixAdminHandler';
import { getAdminReviewerCandidatesHandler } from '../handlers/admin/supervision/getAdminReviewerCandidatesHandler';
import { getReviewerCandidateDetailsHandler } from '../handlers/supervision/getReviewerCandidateDetailsHandler';

import { verifyToken } from '../middlewares/verifyToken';

// импорт целевого уровня
import { updateTargetLevelHandler } from '../handlers/admin/updateTargetLevel';

export async function usersRoutes(app: FastifyInstance) {
  app.patch('/admin/users/:id/role', { preHandler: verifyToken }, toggleUserRoleHandler);
  app.get('/admin/users/:id/details', { preHandler: verifyToken }, getUserFullDetailsHandler);
  app.get('/admin/users/:id/action-log', { preHandler: verifyToken }, getUserActionLogHandler);
  app.get('/admin/users', { preHandler: verifyToken }, getUsersHandler);
  app.patch('/admin/users/:id', { preHandler: verifyToken }, updateUserBasicInfoHandler);
  app.patch('/admin/users/:id/visibility', { preHandler: verifyToken }, updateUserVisibilityHandler);
  app.patch('/admin/users/:id/archive', { preHandler: verifyToken }, archiveUserHandler);
  app.patch('/admin/users/:id/restore', { preHandler: verifyToken }, restoreUserHandler);

  // Добавлен новый маршрут для таргет-левела
  app.patch('/admin/users/:id/target-level', { preHandler: verifyToken }, updateTargetLevelHandler);

  // Supervision (admin-only)
  app.get('/admin/supervision/reviewer-candidates', { preHandler: verifyToken }, getAdminReviewerCandidatesHandler);
  app.get('/admin/supervision/reviewer-candidates/:relationId', { preHandler: verifyToken }, getReviewerCandidateDetailsHandler);
  app.get('/admin/supervision/:userId/matrix', { preHandler: verifyToken }, getUserSupervisionMatrixAdminHandler);
  app.patch('/admin/supervision/:userId/matrix', { preHandler: verifyToken }, updateUserSupervisionMatrixAdminHandler);

  // CEU (admin-only)
  app.get('/admin/ceu/history', { preHandler: verifyToken }, getCEUHistoryAdminHandler);
  app.get('/admin/ceu/history/export.csv', { preHandler: verifyToken }, getCEUHistoryAdminExportHandler);
  app.get('/admin/ceu/:userId/matrix', { preHandler: verifyToken }, getUserCEUMatrixAdminHandler);
  app.get('/admin/users/:id/export', { preHandler: verifyToken }, getUserExportHandler);
  app.patch('/admin/ceu/:userId/matrix', { preHandler: verifyToken }, updateUserCEUMatrixAdminHandler);

  // Users
  app.patch('/admin/users/:id/password', { preHandler: verifyToken }, updateUserPasswordAdminHandler);

  // Exel export
  app.get("/admin/users/export.xlsx", { preHandler: verifyToken }, getUsersExportXlsxHandler);
}
