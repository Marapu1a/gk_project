import { FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcrypt'
import { prisma } from '../../lib/prisma'
import { signJwt } from '../../utils/jwt'

export async function registerHandler(req: FastifyRequest, reply: FastifyReply) {
  const { email, firstName, lastName, phone, password } = req.body as {
    email: string
    firstName: string
    lastName: string
    phone?: string
    password: string
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return reply.code(400).send({ error: 'Email уже используется' })

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      firstName,
      lastName,
      phone,
      role: 'STUDENT',
      password: hashedPassword,
    },
  })

  const token = signJwt({ userId: user.id, role: user.role })

  return reply.send({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  })
}
