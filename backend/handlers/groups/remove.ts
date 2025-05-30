import { FastifyRequest, FastifyReply } from 'fastify'
import { removeUserFromGroup } from '../../utils/group'
import { prisma } from '../../lib/prisma'

export async function removeUserFromGroupHandler(req: FastifyRequest, reply: FastifyReply) {
  const user = req.user
  if (!user || user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Forbidden' })
  }

  const { groupId } = req.params as { groupId: string }
  const { userId } = req.body as { userId?: string }

  if (!userId || !groupId) {
    return reply.code(400).send({ error: 'Missing userId or groupId' })
  }

  const group = await prisma.group.findUnique({ where: { id: groupId } })
  if (!group) {
    return reply.code(404).send({ error: 'Group not found' })
  }

  try {
    await removeUserFromGroup(userId, group.name)
    return reply.send({ success: true })
  } catch (err) {
    req.log.error(err)
    return reply.code(500).send({ error: 'Internal Server Error' })
  }
}
