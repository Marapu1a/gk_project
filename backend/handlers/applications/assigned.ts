import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'

export async function listAssignedRequestsHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user
  if (!user) return reply.code(401).send({ error: 'Не авторизован' })

  const isAdmin = user.role === 'ADMIN'

  const isSupervisor = await prisma.userGroup.findFirst({
    where: {
      userId: user.userId,
      group: { name: 'Супервизор' },
    },
  })

  if (!isAdmin && !isSupervisor) {
    return reply.code(403).send({ error: 'Нет доступа к заявкам' })
  }

  const requests = await prisma.supervisionRequest.findMany({
    where: { supervisorId: user.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      student: true,
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
      approvedHoursInstructor: r.approvedHoursInstructor,
      approvedHoursCurator: r.approvedHoursCurator,
      approvedHoursSupervisor: r.approvedHoursSupervisor,
      student: {
        email: r.student.email,
        fullName: `${r.student.firstName} ${r.student.lastName}`,
      },
    }))
  )
}
