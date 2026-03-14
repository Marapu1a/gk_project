// src/routes/cycleRoutes.ts
import { FastifyInstance } from 'fastify';
import { verifyToken } from '../middlewares/verifyToken';

import { getActiveCycleDashboardHandler } from '../handlers/cycles/getActiveCycleDashboardHandler';
import { abortCycleHandler } from '../handlers/cycles/abortCycleHandler';

export async function cycleRoutes(app: FastifyInstance) {
  // активный цикл текущего пользователя
  app.get('/cycles/active/dashboard', { preHandler: [verifyToken] }, getActiveCycleDashboardHandler);

  // ❗ прерывание цикла админом
  app.post('/cycles/:id/abort', { preHandler: [verifyToken] }, abortCycleHandler);
}
