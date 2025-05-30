import { FastifyInstance } from 'fastify'
import { addUserToGroupHandler } from '../handlers/groups/add'
import { removeUserFromGroupHandler } from '../handlers/groups/remove'
import { verifyToken } from '../middlewares/verifyToken'

export async function groupRoutes(app: FastifyInstance) {
  app.post('/groups/:groupId/add-user', { preHandler: verifyToken }, addUserToGroupHandler)
  app.post('/groups/:groupId/remove-user', { preHandler: verifyToken }, removeUserFromGroupHandler)
}
