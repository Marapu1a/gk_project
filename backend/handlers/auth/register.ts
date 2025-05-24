// backend/handlers/auth/register.ts
import { FastifyRequest, FastifyReply } from "fastify"
import { PrismaClient, Role } from "@prisma/client"
import { createGCUser } from "../../lib/getCourseClient"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()

export default async function registerHandler(req: FastifyRequest, reply: FastifyReply) {
  const { email, firstName, lastName, role = "STUDENT" } = req.body as {
    email: string
    firstName: string
    lastName?: string
    role?: Role
  }

  if (!email || !firstName) {
    return reply.status(400).send({ error: "Email и имя обязательны" })
  }

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) return reply.status(409).send({ error: "Пользователь уже существует" })

  let gcId: number | null = null

  try {
    const gcUserId = await createGCUser({ email, firstName, lastName, group: role })
    gcId = parseInt(gcUserId)

    if (isNaN(gcId)) {
      return reply.status(500).send({ error: "Ошибка при создании пользователя в GetCourse" })
    }
  } catch (e: any) {
    console.warn("GC error:", e?.message || e)
    return reply.status(500).send({ error: "Ошибка при подключении к GetCourse" })
  }

  const user = await prisma.user.create({
    data: {
      email,
      firstName,
      lastName,
      role,
      ...(gcId !== undefined ? { gcId } : {}),
    },
  })

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  )

  reply.send({ token, user })
}
