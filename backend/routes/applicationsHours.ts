// routes/applicationsHours.ts
import { FastifyInstance } from 'fastify'
import { createApplicationHoursHandler } from '../handlers/applicationsHours/createApplicationHoursHandler'
import { verifyToken } from '../middlewares/verifyToken'

export async function applicationsHoursRoutes(app: FastifyInstance) {
  app.post('/application/hours', { preHandler: verifyToken }, createApplicationHoursHandler)
}
