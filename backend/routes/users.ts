import { FastifyInstance } from 'fastify'
import { meHandler } from '../handlers/users/me'
import { getSupervisionHoursHandler } from '../handlers/users/supervisionHours'

import { verifyToken } from '../middlewares/verifyToken'

export async function userRoutes(app: FastifyInstance) {
  app.get('/users/me', { preHandler: verifyToken }, meHandler)
  app.get('/supervision-hours/summary', { preHandler: verifyToken }, getSupervisionHoursHandler)
}
