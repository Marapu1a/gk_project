import { FastifyInstance } from 'fastify'
import { registerHandler } from '../handlers/auth/register'
import { loginHandler } from '../handlers/auth/login'
import { forgotPasswordHandler } from '../handlers/auth/forgotPassword';
import { resetPasswordHandler } from '../handlers/auth/resetPassword';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', registerHandler)
  app.post('/auth/login', loginHandler)
  app.post('/auth/forgot-password', forgotPasswordHandler);
  app.post('/auth/reset-password', resetPasswordHandler);
}
