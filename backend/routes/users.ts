// backend/routes/users.ts
import { FastifyInstance } from "fastify"
import { verifyToken } from "../middlewares/verifyToken"
import getMeHandler from "../handlers/users/me"

export default async function userRoutes(app: FastifyInstance) {
  app.get("/me", { preHandler: verifyToken }, getMeHandler)
}
