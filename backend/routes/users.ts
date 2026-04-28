// src/routes/users.ts
import { FastifyInstance } from 'fastify';
import { verifyToken } from '../middlewares/verifyToken';
import { getModeratorsHandler } from '../handlers/users/getModeratorsHandler';
import { getUserByEmailHandler } from '../handlers/users/getUserByEmail';
import { setAvatarUrlHandler } from '../handlers/users/setAvatarUrlHandler';
import { setUserBioHandler } from '../handlers/users/setBio';
import { deleteUserHandler } from '../handlers/users/deleteUser';
import { setTargetLevelHandler } from '../handlers/users/setTargetLevel';
import { abandonActiveCycleHandler } from '../handlers/users/abandonActiveCycle';
import { getReviewerSuggestionsHandler } from '../handlers/users/getReviewerSuggestionsHandler';

export async function moderatorsRoutes(app: FastifyInstance) {
  app.get('/moderators', { preHandler: [verifyToken] }, getModeratorsHandler);
  app.get('/moderators/user-by-email', { preHandler: [verifyToken] }, getUserByEmailHandler);
  app.get('/users/reviewers', { preHandler: [verifyToken] }, getReviewerSuggestionsHandler);

  app.patch('/users/:id/avatar-url', { preHandler: [verifyToken] }, setAvatarUrlHandler);
  app.patch('/users/:userId/bio', { preHandler: [verifyToken] }, setUserBioHandler);
  app.patch('/users/:id/target-level', { preHandler: [verifyToken] }, setTargetLevelHandler);
  app.patch('/users/:id/abandon-cycle', { preHandler: [verifyToken] }, abandonActiveCycleHandler);

  app.delete('/admin/users/:id', { preHandler: [verifyToken] }, deleteUserHandler);
}
