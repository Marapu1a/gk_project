import { FastifyInstance } from 'fastify'
import { createApplicationHandler } from '../handlers/applications/create'
import { listApplicationsHandler } from '../handlers/applications/list'
import { listAssignedRequestsHandler } from '../handlers/applications/assigned'
import { updateRequestStatusHandler } from '../handlers/applications/update-status'

import { verifyToken } from '../middlewares/verifyToken'

export async function applicationRoutes(app: FastifyInstance) {
  app.post('/supervision-requests', { preHandler: verifyToken }, createApplicationHandler)
  app.get('/supervision-requests', { preHandler: verifyToken }, listApplicationsHandler)
  app.get('/supervision-requests/assigned', { preHandler: verifyToken }, listAssignedRequestsHandler)
  app.post('/supervision-requests/:id/status', { preHandler: verifyToken }, updateRequestStatusHandler)
}
