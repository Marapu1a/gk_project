import { FastifyInstance } from 'fastify';
import { getModeratorsHandler } from '../handlers/users/getModeratorsHandler';
import { getUserByEmailHandler } from '../handlers/users/getUserByEmail';

export async function moderatorsRoutes(app: FastifyInstance) {
  app.get('/moderators', getModeratorsHandler);
  app.get('/moderators/user-by-email', getUserByEmailHandler);
}
