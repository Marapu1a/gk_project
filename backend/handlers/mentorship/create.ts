import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'
import { isUserInGroup } from '../../utils/group'

export async function createMentorshipRequestHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user
  if (!user) return reply.code(401).send({ error: 'Unauthorized' })

  const { approverEmail, hours } = req.body as {
    approverEmail?: string
    hours?: number
  }

  if (!approverEmail || !hours || hours <= 0) {
    return reply.code(400).send({ error: 'Invalid data' })
  }

  const isSupervisor = await isUserInGroup(user.userId, 'Супервизор')
  if (!isSupervisor) {
    return reply.code(403).send({ error: 'Only Supervisors can submit mentorship requests' })
  }

  const approver = await prisma.user.findUnique({ where: { email: approverEmail } })
  if (!approver) return reply.code(404).send({ error: 'Approver not found' })

  const isExperienced = await isUserInGroup(approver.id, 'Опытный Супервизор')
  if (!isExperienced) {
    return reply.code(400).send({ error: 'Approver must be Опытный Супервизор' })
  }

  const request = await prisma.mentorshipRequest.create({
    data: {
      mentorId: user.userId,
      approverId: approver.id,
      hours,
    },
  })

  return reply.send({ success: true, id: request.id })
}
