// import { FastifyInstance } from 'fastify'
// import { createMentorshipRequestHandler } from '../handlers/mentorship/create'
// import { listAssignedMentorshipsHandler } from '../handlers/mentorship/list-assigned'
// import { updateMentorshipStatusHandler } from '../handlers/mentorship/update-status'

// import { verifyToken } from '../middlewares/verifyToken'

// export async function mentorshipRoutes(app: FastifyInstance) {
//   app.post('/mentorship-requests', { preHandler: verifyToken }, createMentorshipRequestHandler)
//   app.get('/mentorship-requests/assigned', { preHandler: verifyToken }, listAssignedMentorshipsHandler)
//   app.post('/mentorship-requests/:id/status', { preHandler: verifyToken }, updateMentorshipStatusHandler)
// }
