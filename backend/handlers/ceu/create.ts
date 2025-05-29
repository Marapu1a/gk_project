import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'
import { createCEUSchema } from '../../schemas/ceu'

export async function createCEUHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user
  if (!user) return reply.code(401).send({ error: 'Не авторизован' })

  const parsed = createCEUSchema.safeParse(req.body)
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Неверные данные', details: parsed.error.flatten() })
  }

  const ceu = await prisma.cEURecord.create({
    data: {
      userId: user.userId,
      event_name: parsed.data.event_name,
      event_date: parsed.data.event_date,
      file_id: parsed.data.file_id,
      ceu_ethics: parsed.data.ceu_ethics,
      ceu_cult_diver: parsed.data.ceu_cult_diver,
      ceu_superv: parsed.data.ceu_superv,
      ceu_general: parsed.data.ceu_general,
    },
  })

  return reply.code(201).send({ id: ceu.id, createdAt: ceu.createdAt })
}
