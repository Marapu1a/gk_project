import { FastifyInstance } from 'fastify'
import { addUserToGroupHandler } from '../handlers/groups/add'
import { removeUserFromGroupHandler } from '../handlers/groups/remove'
import { listGroupsHandler } from '../handlers/groups/list'
import { listUsersInGroupHandler } from '../handlers/groups/users'

import { verifyToken } from '../middlewares/verifyToken'

export async function groupRoutes(app: FastifyInstance) {
  app.post('/groups/:groupId/add-user', { preHandler: verifyToken }, addUserToGroupHandler)
  app.post('/groups/:groupId/remove-user', { preHandler: verifyToken }, removeUserFromGroupHandler)
  app.get('/groups', { preHandler: verifyToken }, listGroupsHandler)
  app.get('/groups/:groupId/users', { preHandler: verifyToken }, listUsersInGroupHandler)
}
