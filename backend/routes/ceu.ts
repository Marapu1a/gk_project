import { FastifyInstance } from 'fastify'
import { createCeuHandler } from '../handlers/ceu/createCeuHandler'
import { listCeuHandler } from '../handlers/ceu/listCeuHandler'
import { ceuSummaryHandler } from '../handlers/ceu/CEUsummary';
import { ceuHistoryHandler } from '../handlers/ceu/history';
import { getCEUByEmailHandler } from '../handlers/ceu/getCEUByEmail';
import { updateCEUEntryHandler } from '../handlers/ceu/updateCEUEntry';

import { verifyToken } from '../middlewares/verifyToken'

export async function ceuRoutes(app: FastifyInstance) {
  app.post('/ceu/create', { preHandler: [verifyToken] }, createCeuHandler);
  app.get('/ceu/list', { preHandler: [verifyToken] }, listCeuHandler);
  app.get('/ceu/summary', { preHandler: [verifyToken] }, ceuSummaryHandler);
  app.get('/ceu/history', { preHandler: [verifyToken] }, ceuHistoryHandler);
  app.get('/ceu/by-email', { preHandler: [verifyToken] }, getCEUByEmailHandler);
  app.patch('/ceu/entry/:id', { preHandler: [verifyToken] }, updateCEUEntryHandler);
}
