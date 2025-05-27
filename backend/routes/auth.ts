import { FastifyInstance } from 'fastify'
import { registerHandler } from '../handlers/auth/register'
import { loginHandler } from '../handlers/auth/login'

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', registerHandler)
  app.post('/auth/login', loginHandler)
}
