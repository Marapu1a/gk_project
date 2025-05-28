import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'

const patchSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
})

export default async function updateApplicationStatus(
  req: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply
) {
  const { id } = req.params
  const body = patchSchema.safeParse(req.body)
  const user = req.user // уже есть после verifyToken

  if (!body.success) {
    return reply.status(400).send({ error: 'Неверные данные запроса' })
  }

  const { status } = body.data

  const application = await prisma.application.findUnique({
    where: { id },
  })

  if (!application) {
    return reply.status(404).send({ error: 'Заявка не найдена' })
  }

  const isAdmin = user!.role === 'ADMIN'
  const isSupervisor = user!.role === 'SUPERVISOR' && userId === application.supervisorId

  if (!isAdmin && !isSupervisor) {
    return reply.status(403).send({ error: 'Нет доступа к заявке' })
  }

  if (['APPROVED', 'REJECTED'].includes(application.status)) {
    return reply.status(400).send({ error: 'Статус заявки уже финальный' })
  }

  const updated = await prisma.application.update({
    where: { id },
    data: { status },
  })

  return reply.send(updated)
}
