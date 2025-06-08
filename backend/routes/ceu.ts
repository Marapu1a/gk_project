import { FastifyInstance } from 'fastify'
import { createCEUHandler } from '../handlers/ceu/create'
import { listAllCEUHandler } from '../handlers/ceu/list'
import { invalidateCEUHandler } from '../handlers/ceu/invalidate'
import { getMyCEU } from '../handlers/ceu/my'
import { getCeuSummaryHandler } from '../handlers/ceu/getCeuSummary'

import { verifyToken } from '../middlewares/verifyToken'

export async function ceuRoutes(app: FastifyInstance) {
  app.post('/ceu-records', { preHandler: verifyToken }, createCEUHandler)
  app.get('/ceu-records', { preHandler: verifyToken }, listAllCEUHandler)
  app.post('/ceu-records/:id/invalidate', { preHandler: verifyToken }, invalidateCEUHandler)
  app.get('/ceu/my', { preHandler: verifyToken }, getMyCEU);
  app.get('/ceu/summary', { preHandler: verifyToken }, getCeuSummaryHandler)
}
