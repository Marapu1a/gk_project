import { FastifyInstance } from 'fastify';
import { verifyToken } from '../middlewares/verifyToken';
import {
  getActiveUserBannerHandler,
  getAdminUserBannerHandler,
  updateAdminUserBannerHandler,
} from '../handlers/userBanner/userBannerHandlers';

export async function userBannerRoutes(app: FastifyInstance) {
  app.get('/user-banner/active', { preHandler: [verifyToken] }, getActiveUserBannerHandler);
  app.get('/admin/user-banner', { preHandler: [verifyToken] }, getAdminUserBannerHandler);
  app.put('/admin/user-banner', { preHandler: [verifyToken] }, updateAdminUserBannerHandler);
}
