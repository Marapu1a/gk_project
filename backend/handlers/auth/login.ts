import { FastifyRequest, FastifyReply } from "fastify"
import { PrismaClient, Role } from "@prisma/client"
import jwt from "jsonwebtoken"
import { getUserGroupsFromGC } from "../../lib/getUserGroups"

const prisma = new PrismaClient()

function resolveRoleFromGroups(groups: string[]): Role {
  if (groups.includes("ADMIN")) return "ADMIN"
  if (groups.includes("SUPERVISOR")) return "SUPERVISOR"
  return "STUDENT"
}

export default async function loginHandler(req: FastifyRequest, reply: FastifyReply) {
  const { email } = req.body as { email: string }

  if (!email) {
    return reply.status(400).send({ error: "Email обязателен" })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return reply.status(404).send({ error: "Пользователь не найден" })
  }

  // 1. Получаем актуальные группы с GC
  const gcGroups = await getUserGroupsFromGC(email)
  const actualRole = resolveRoleFromGroups(gcGroups)

  // 2. Обновляем, если роль изменилась
  if (actualRole !== user.role) {
    await prisma.user.update({
      where: { email },
      data: { role: actualRole },
    })
    // обновляем в объекте user вручную, чтобы не делать второй запрос
    Object.assign(user, { role: actualRole })
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  )

  reply.send({ token, user })
}
