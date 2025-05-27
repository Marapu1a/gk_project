import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'
import { verifyJwt } from '../../utils/jwt'

export async function getMeHandler(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization
  if (!authHeader) return reply.code(401).send({ error: 'Нет токена' })

  const token = authHeader.replace('Bearer ', '')
  const payload = verifyJwt<{ userId: string }>(token)

  if (!payload) return reply.code(401).send({ error: 'Недействительный токен' })

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
    },
  })

  if (!user) return reply.code(404).send({ error: 'Пользователь не найден' })

  return reply.send({ user })
}
