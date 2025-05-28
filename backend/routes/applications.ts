import { FastifyInstance } from 'fastify'
import { createApplicationHandler } from '../handlers/applications/create'

import { verifyToken } from '../middlewares/verifyToken'

export async function applicationRoutes(app: FastifyInstance) {
  app.post('/supervision-requests', { preHandler: verifyToken }, createApplicationHandler)
}
