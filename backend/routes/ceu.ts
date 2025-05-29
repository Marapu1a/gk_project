import { FastifyInstance } from 'fastify'
import { createCEUHandler } from '../handlers/ceu/create'
import { listAllCEUHandler } from '../handlers/ceu/list'
import { invalidateCEUHandler } from '../handlers/ceu/invalidate'

import { verifyToken } from '../middlewares/verifyToken'

export async function ceuRoutes(app: FastifyInstance) {
  app.post('/ceu-records', { preHandler: verifyToken }, createCEUHandler)
  app.get('/ceu-records', { preHandler: verifyToken }, listAllCEUHandler)
  app.post('/ceu-records/:id/invalidate', { preHandler: verifyToken }, invalidateCEUHandler)
}
