import { FastifyInstance } from 'fastify'
import { createSupervisionHandler } from '../handlers/supervision/createSupervisionHandler';
import { listSupervisionHandler } from '../handlers/supervision/listSupervisionHandler';
import { supervisionSummaryHandler } from '../handlers/supervision/supervisionSummary';
import { supervisionHistoryHandler } from '../handlers/supervision/history';

import { verifyToken } from '../middlewares/verifyToken'

export async function supervisionRoutes(app: FastifyInstance) {
  app.post('/supervision/create', { preHandler: [verifyToken] }, createSupervisionHandler);
  app.get('/supervision/list', { preHandler: [verifyToken] }, listSupervisionHandler);
  app.get('/supervision/summary', { preHandler: [verifyToken] }, supervisionSummaryHandler);
  app.get('/supervision/history', { preHandler: [verifyToken] }, supervisionHistoryHandler);
}
