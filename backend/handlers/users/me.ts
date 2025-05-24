// backend/handlers/users/me.ts
import { FastifyRequest, FastifyReply } from "fastify"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default async function getMeHandler(req: FastifyRequest, reply: FastifyReply) {
  const userId = req.user?.userId

  if (!userId) {
    return reply.status(401).send({ error: "Не авторизован" })
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    return reply.status(404).send({ error: "Пользователь не найден" })
  }

  reply.send({ user })
}
