import { FastifyInstance } from 'fastify'
import { getMeHandler } from '../handlers/users/me'
import { verifyToken } from '../middlewares/verifyToken'

export async function userRoutes(app: FastifyInstance) {
  app.get('/users/me', { preHandler: verifyToken }, getMeHandler)
}
