import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'
import { updateSupervisionStatusSchema } from '../../schemas/supervision'


export async function updateRequestStatusHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user
  if (!user) return reply.code(401).send({ error: 'Не авторизован' })

  const { id } = req.params as { id: string }

  if (!id) return reply.code(400).send({ error: 'Не указан ID заявки' })

  const parsed = updateSupervisionStatusSchema.safeParse(req.body)
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() })
  }

  const request = await prisma.supervisionRequest.findUnique({ where: { id } })
  if (!request) return reply.code(404).send({ error: 'Заявка не найдена' })

  const isAdmin = user.role === 'ADMIN'
  const isSupervisor = await prisma.userGroup.findFirst({
    where: {
      userId: user.userId,
      group: { name: 'Супервизор' },
    },
  })

  if (!isAdmin && !isSupervisor) {
    return reply.code(403).send({ error: 'Недостаточно прав' })
  }

  if (request.supervisorId !== user.userId && !isAdmin) {
    return reply.code(403).send({ error: 'Можно менять только свои заявки' })
  }

  const updated = await prisma.supervisionRequest.update({
    where: { id },
    data: {
      status: parsed.data.status,
      approvedHoursInstructor: parsed.data.approvedHoursInstructor ?? null,
      approvedHoursCurator: parsed.data.approvedHoursCurator ?? null,
      approvedHoursSupervisor: parsed.data.approvedHoursSupervisor ?? null,
    },
  })

  return reply.send({ updated: true, status: updated.status })
}
