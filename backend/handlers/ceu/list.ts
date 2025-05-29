import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'

export async function listAllCEUHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user
  if (!user || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Доступ запрещён' })
  }

  const records = await prisma.cEURecord.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: true,
    },
  })

  return reply.send(
    records.map(r => ({
      id: r.id,
      isValid: r.is_valid,
      spent: r.spentOnCertificate,
      fileId: r.file_id,
      eventName: r.event_name,
      eventDate: r.event_date,
      ceu: {
        ethics: r.ceu_ethics,
        cultural: r.ceu_cult_diver,
        supervision: r.ceu_superv,
        general: r.ceu_general,
      },
      user: {
        id: r.user.id,
        email: r.user.email,
        fullName: `${r.user.firstName} ${r.user.lastName}`,
      },
      createdAt: r.createdAt,
    }))
  )
}
