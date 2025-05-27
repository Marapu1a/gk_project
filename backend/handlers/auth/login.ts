import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../../lib/prisma'
import { signJwt } from '../../utils/jwt'
import bcrypt from 'bcrypt'

export async function loginHandler(req: FastifyRequest, reply: FastifyReply) {
  const { email, password } = req.body as { email: string; password: string }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return reply.code(401).send({ error: 'Неверный email или пароль' })

  const redirectTo =
    user.role === 'ADMIN' ? '/admin' :
      user.role === 'SUPERVISOR' ? '/supervisor' :
        '/dashboard'

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return reply.code(401).send({ error: 'Неверный email или пароль' })

  const token = signJwt({ userId: user.id, role: user.role })

  return reply.send({
    token,
    user: { id: user.id, email: user.email, role: user.role },
    redirectTo
  })
}
