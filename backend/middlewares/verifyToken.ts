// backend/middlewares/verifyToken.ts
import { FastifyRequest, FastifyReply } from "fastify"
import jwt from "jsonwebtoken"

export async function verifyToken(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Отсутствует токен" })
  }

  const token = authHeader.split(" ")[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string
      role: string
    }
    req.user = decoded // 👈 прокидываем в `req`
  } catch {
    return reply.status(401).send({ error: "Недействительный токен" })
  }
}
