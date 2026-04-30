import { FastifyInstance } from 'fastify'
import { createSupervisionHandler } from '../handlers/supervision/createSupervisionHandler';
import { listSupervisionHandler } from '../handlers/supervision/listSupervisionHandler';
import { supervisionSummaryHandler } from '../handlers/supervision/supervisionSummary';
import { supervisionHistoryHandler } from '../handlers/supervision/history';
import { supervisionHistoryRecordsHandler } from '../handlers/supervision/historyRecords';
import { getAssignedHoursHandler } from '../handlers/supervision/getAssignedHoursHandler';
import { updateSupervisionHourHandler } from '../handlers/supervision/updateSupervisionHour';
import { upsertSupervisionDistributionHandler } from '../handlers/supervision/upsertSupervisionDistributionHandler';
import { createSupervisionContractHandler } from '../handlers/supervision/createSupervisionContractHandler';
import { listSupervisionContractsHandler } from '../handlers/supervision/listSupervisionContractsHandler';
import { deleteSupervisionContractHandler } from '../handlers/supervision/deleteSupervisionContractHandler';

import { verifyToken } from '../middlewares/verifyToken'

export async function supervisionRoutes(app: FastifyInstance) {
  app.post('/supervision/create', { preHandler: [verifyToken] }, createSupervisionHandler);
  app.get('/supervision/list', { preHandler: [verifyToken] }, listSupervisionHandler);
  app.get('/supervision/summary', { preHandler: [verifyToken] }, supervisionSummaryHandler);
  app.get('/supervision/history', { preHandler: [verifyToken] }, supervisionHistoryHandler);
  app.get('/supervision/history/records', { preHandler: [verifyToken] }, supervisionHistoryRecordsHandler);
  app.get('/supervision/contracts', { preHandler: [verifyToken] }, listSupervisionContractsHandler);
  app.post('/supervision/contracts', { preHandler: [verifyToken] }, createSupervisionContractHandler);
  app.delete('/supervision/contracts/:id', { preHandler: [verifyToken] }, deleteSupervisionContractHandler);
  app.get('/supervision/review', { preHandler: [verifyToken] }, getAssignedHoursHandler);
  app.patch('/supervision/:id', { preHandler: [verifyToken] }, updateSupervisionHourHandler);
  app.put('/supervision/distribution', { preHandler: [verifyToken] }, upsertSupervisionDistributionHandler);
}
