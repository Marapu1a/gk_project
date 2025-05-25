import { FastifyRequest, FastifyReply } from "fastify"
import { PrismaClient } from "@prisma/client"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()

export default async function loginHandler(req: FastifyRequest, reply: FastifyReply) {
  const { email } = req.body as { email: string }

  if (!email) {
    return reply.status(400).send({ error: "Email обязателен" })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return reply.status(404).send({ error: "Пользователь не найден" })
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  )

  reply.send({ token, user })
}
