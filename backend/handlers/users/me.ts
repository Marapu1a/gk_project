import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'

export async function meHandler(req: FastifyRequest, reply: FastifyReply) {
  const { user } = req
  if (!user?.userId) return reply.code(401).send({ error: 'Не авторизован' })

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } })
  if (!dbUser) return reply.code(404).send({ error: 'Пользователь не найден' })

  return reply.send({
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
    fullName: `${dbUser.firstName} ${dbUser.lastName}`,
  })
}
