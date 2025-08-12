import { FastifyInstance } from 'fastify';
import { verifyToken } from '../middlewares/verifyToken';
import { getModeratorsHandler } from '../handlers/users/getModeratorsHandler';
import { getUserByEmailHandler } from '../handlers/users/getUserByEmail';
import { setAvatarUrlHandler } from '../handlers/users/setAvatarUrlHandler';


export async function moderatorsRoutes(app: FastifyInstance) {
  app.get('/moderators', getModeratorsHandler);
  app.get('/moderators/user-by-email', getUserByEmailHandler);
  app.patch('/users/:id/avatar-url', { preHandler: [verifyToken] }, setAvatarUrlHandler);
}
