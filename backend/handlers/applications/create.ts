import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'
import { supervisionRequestSchema } from '../../schemas/supervision'

export async function createApplicationHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user
  if (!user) return reply.code(401).send({ error: 'Не авторизован' })

  const parsed = supervisionRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() })
  }

  const { supervisorEmail, hoursInstructor, hoursCurator, hoursSupervisor } = parsed.data

  const supervisor = await prisma.user.findUnique({
    where: { email: supervisorEmail },
    include: {
      groups: { include: { group: true } },
    },
  })

  if (!supervisor) {
    return reply.code(404).send({ error: 'Супервизор с таким email не найден' })
  }

  const isSupervisor = supervisor.groups.some(g => g.group.name === 'Супервизоры')
  if (!isSupervisor) {
    return reply.code(400).send({ error: 'Указанный пользователь не является супервизором' })
  }

  const request = await prisma.supervisionRequest.create({
    data: {
      studentId: user.userId,
      supervisorId: supervisor.id,
      hoursInstructor,
      hoursCurator,
      hoursSupervisor,
    },
  })

  return reply.send({
    id: request.id,
    status: request.status,
    createdAt: request.createdAt,
    supervisor: {
      id: supervisor.id,
      email: supervisor.email,
      fullName: `${supervisor.firstName} ${supervisor.lastName}`,
    },
  })
}
