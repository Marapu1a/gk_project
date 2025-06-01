import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'

export async function listUsersInGroupHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user
  if (!user || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Forbidden' })
  }

  const { groupId } = req.params as { groupId: string }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      users: {
        include: {
          user: true,
        },
      },
    },
  })

  if (!group) {
    return reply.code(404).send({ error: 'Group not found' })
  }

  const users = group.users.map(u => ({
    id: u.user.id,
    email: u.user.email,
    fullName: `${u.user.firstName} ${u.user.lastName}`,
  }))

  return reply.send(users)
}
