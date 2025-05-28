import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'

export async function listApplicationsHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user
  if (!user) return reply.code(401).send({ error: 'Не авторизован' })

  let whereClause = {}

  if (user.role === 'STUDENT') {
    whereClause = { studentId: user.userId }
  } else if (user.role === 'SUPERVISOR') {
    whereClause = { supervisorId: user.userId }
  }

  const applications = await prisma.application.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      student: { select: { id: true, email: true, firstName: true, lastName: true } },
      supervisor: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  })

  return reply.send({ applications })
}
