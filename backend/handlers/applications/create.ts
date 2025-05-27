import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'

export async function createApplicationHandler(req: FastifyRequest, reply: FastifyReply) {
  const { type, supervisorId, hours } = req.body as {
    type: 'SUPERVISION' | 'MENTORSHIP'
    supervisorId: string
    hours: number
  }

  const userId = req.user?.userId
  if (!userId) return reply.code(401).send({ error: 'Не авторизован' })

  // проверка на дубли (можно потом усилить)
  const existing = await prisma.application.findFirst({
    where: {
      type,
      studentId: userId,
      supervisorId,
      status: 'PENDING',
    },
  })

  if (existing) {
    return reply.code(400).send({ error: 'Заявка уже подана' })
  }

  const app = await prisma.application.create({
    data: {
      type,
      hours,
      studentId: userId,
      supervisorId,
      status: 'PENDING',
    },
  })

  return reply.send({ application: app })
}
