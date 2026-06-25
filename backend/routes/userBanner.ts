import { FastifyInstance } from 'fastify';
import { verifyToken } from '../middlewares/verifyToken';
import { requireAdmin } from '../middlewares/requireRole';
import {
  getActiveUserBannerHandler,
  getAdminUserBannerHandler,
  updateAdminUserBannerHandler,
} from '../handlers/userBanner/userBannerHandlers';

export async function userBannerRoutes(app: FastifyInstance) {
  app.get('/user-banner/active', { preHandler: [verifyToken] }, getActiveUserBannerHandler);
  app.get('/admin/user-banner', { preHandler: [verifyToken, requireAdmin] }, getAdminUserBannerHandler);
  app.put('/admin/user-banner', { preHandler: [verifyToken, requireAdmin] }, updateAdminUserBannerHandler);
}
