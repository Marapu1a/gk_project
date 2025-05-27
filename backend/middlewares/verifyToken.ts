import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyJwt } from '../utils/jwt'

export async function verifyToken(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization
  if (!authHeader) return reply.code(401).send({ error: 'Нет токена' })

  const token = authHeader.replace('Bearer ', '')
  const payload = verifyJwt<{ userId: string; role: string }>(token)

  if (!payload) return reply.code(401).send({ error: 'Неверный токен' })

  request.user = payload // 👈 Добавил `user` в FastifyRequest через декларацию
}
