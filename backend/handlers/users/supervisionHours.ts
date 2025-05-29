import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'

export async function getSupervisionHoursHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user
  if (!user) return reply.code(401).send({ error: 'Не авторизован' })

  const requests = await prisma.supervisionRequest.findMany({
    where: {
      studentId: user.userId,
      status: 'APPROVED',
    },
    select: {
      approvedHoursInstructor: true,
      approvedHoursCurator: true,
      approvedHoursSupervisor: true,
    },
  })

  const sum = (field: keyof typeof requests[0]) =>
    requests.reduce((acc, r) => acc + (r[field] ?? 0), 0)

  return reply.send({
    hoursInstructor: sum('approvedHoursInstructor'),
    hoursCurator: sum('approvedHoursCurator'),
    hoursSupervisor: sum('approvedHoursSupervisor'),
  })
}
