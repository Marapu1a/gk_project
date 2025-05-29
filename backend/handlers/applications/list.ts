import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'

export async function listApplicationsHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user
  if (!user) return reply.code(401).send({ error: 'Не авторизован' })

  const requests = await prisma.supervisionRequest.findMany({
    where: { studentId: user.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      supervisor: true,
    },
  })

  return reply.send(
    requests.map(r => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt,
      hoursInstructor: r.hoursInstructor,
      hoursCurator: r.hoursCurator,
      hoursSupervisor: r.hoursSupervisor,
      supervisor: {
        email: r.supervisor.email,
        fullName: `${r.supervisor.firstName} ${r.supervisor.lastName}`,
      },
    }))
  )
}
