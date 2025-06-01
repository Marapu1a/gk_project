import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'
import { isUserInGroup } from '../../utils/group'

export async function listAssignedMentorshipsHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user
  if (!user) return reply.code(401).send({ error: 'Unauthorized' })

  const isExperienced = await isUserInGroup(user.userId, 'Опытный Супервизор')
  if (!isExperienced) {
    return reply.code(403).send({ error: 'Only Experienced Supervisors can view assigned requests' })
  }

  const requests = await prisma.mentorshipRequest.findMany({
    where: { approverId: user.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      mentor: true,
    },
  })

  return reply.send(requests.map(r => ({
    id: r.id,
    hours: r.hours,
    status: r.status,
    createdAt: r.createdAt,
    mentor: {
      id: r.mentor.id,
      email: r.mentor.email,
      fullName: `${r.mentor.firstName} ${r.mentor.lastName}`,
    },
  })))
}
