// routes/applicationsCEU.ts
import { FastifyInstance } from 'fastify'
import { createApplicationCEUHandler } from '../handlers/applicationsCEU/createApplicationCEUHandler'
import { verifyToken } from '../middlewares/verifyToken'

export async function applicationsCEURoutes(app: FastifyInstance) {
  app.post('/application/ceu', { preHandler: verifyToken }, createApplicationCEUHandler)
}
