import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'

export async function updateMentorshipStatusHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user
  if (!user) return reply.code(401).send({ error: 'Unauthorized' })

  const { id } = req.params as { id: string }
  const { status } = req.body as { status?: 'APPROVED' | 'REJECTED' }

  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    return reply.code(400).send({ error: 'Invalid status value' })
  }

  const request = await prisma.mentorshipRequest.findUnique({ where: { id } })
  if (!request) return reply.code(404).send({ error: 'Request not found' })

  if (request.approverId !== user.userId) {
    return reply.code(403).send({ error: 'Forbidden: not your request' })
  }

  await prisma.mentorshipRequest.update({
    where: { id },
    data: { status },
  })

  return reply.send({ success: true })
}
