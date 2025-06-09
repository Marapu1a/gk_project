import { FastifyInstance } from 'fastify'
import { registerHandler } from '../handlers/auth/register'
import { loginHandler } from '../handlers/auth/login'
import { meHandler } from '../handlers/auth/me'
import { verifyToken } from '../middlewares/verifyToken'
import { forgotPasswordHandler } from '../handlers/auth/forgotPassword';
import { resetPasswordHandler } from '../handlers/auth/resetPassword';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', registerHandler)
  app.post('/auth/login', loginHandler)
  app.get('/auth/me', { preHandler: verifyToken }, meHandler)
  app.post('/auth/forgot-password', forgotPasswordHandler);
  app.post('/auth/reset-password', resetPasswordHandler);
}
