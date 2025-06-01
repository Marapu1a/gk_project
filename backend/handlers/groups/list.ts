import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'

export async function listGroupsHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user
  if (!user || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Forbidden' })
  }

  const groups = await prisma.group.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return reply.send(groups)
}
