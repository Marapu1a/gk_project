import { FastifyInstance } from 'fastify';
import { verifyToken } from '../middlewares/verifyToken';
import { requireAdmin } from '../middlewares/requireRole';
import { getAllExamAppsHandler } from '../handlers/examApplications/getAll';
import { getExamAppDetailsHandler } from '../handlers/examApplications/getDetails';
import { getMyExamAppHandler } from '../handlers/examApplications/getMine';
import { patchExamAppStatusHandler } from '../handlers/examApplications/patchStatus';

export async function examApplicationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verifyToken);

  app.get('/exam-applications', { preHandler: requireAdmin }, getAllExamAppsHandler); // ADMIN only
  app.get('/exam-applications/me', getMyExamAppHandler);         // текущий пользователь
  app.get('/exam-applications/:userId/details', getExamAppDetailsHandler);
  app.patch('/exam-applications/:userId/status', patchExamAppStatusHandler); // смена статуса
}
