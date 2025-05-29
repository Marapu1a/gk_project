import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'

export async function invalidateCEUHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user
  if (!user || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Доступ запрещён' })
  }

  const { id } = req.params as { id: string }
  if (!id) return reply.code(400).send({ error: 'Не указан ID записи' })

  const record = await prisma.cEURecord.findUnique({ where: { id } })
  if (!record) return reply.code(404).send({ error: 'Запись не найдена' })

  if (record.spentOnCertificate) {
    return reply.code(400).send({ error: 'Запись уже потрачена на сертификацию' })
  }

  if (!record.is_valid) {
    return reply.send({ invalidated: false, reason: 'Запись уже невалидна' })
  }

  await prisma.cEURecord.update({
    where: { id },
    data: { is_valid: false },
  })

  return reply.send({ invalidated: true })
}
