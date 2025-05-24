// backend/routes/auth.ts
import { FastifyInstance } from "fastify"
import registerHandler from "../handlers/auth/register"
import loginHandler from "../handlers/auth/login"

export default async function authRoutes(app: FastifyInstance) {
  app.post("/register", registerHandler)
  app.post("/login", loginHandler)
}
