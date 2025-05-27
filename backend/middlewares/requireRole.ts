import { FastifyRequest, FastifyReply } from 'fastify'

export function requireRole(role: string) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    if (!request.user || request.user.role !== role) {
      return reply.code(403).send({ error: 'Доступ запрещён' })
    }
  }
}
