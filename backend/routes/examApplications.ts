import { FastifyInstance } from 'fastify';
import { verifyToken } from '../middlewares/verifyToken';
import { getAllExamAppsHandler } from '../handlers/examApplications/getAll';
import { getMyExamAppHandler } from '../handlers/examApplications/getMine';
import { patchExamAppStatusHandler } from '../handlers/examApplications/patchStatus';

export async function examApplicationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', verifyToken);

  app.get('/exam-applications', getAllExamAppsHandler);          // ADMIN only (проверка внутри)
  app.get('/exam-applications/me', getMyExamAppHandler);         // текущий пользователь
  app.patch('/exam-applications/:userId/status', patchExamAppStatusHandler); // смена статуса
}
