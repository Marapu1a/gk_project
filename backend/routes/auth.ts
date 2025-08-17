import { FastifyInstance } from 'fastify'
import { registerHandler } from '../handlers/auth/register'
import { loginHandler } from '../handlers/auth/login'
import { meHandler } from '../handlers/auth/me'
import { forgotPasswordHandler } from '../handlers/auth/forgotPassword';
import { resetPasswordHandler } from '../handlers/auth/resetPassword';
import { updateMeHandler } from '../handlers/auth/updateMeHandler';

import { verifyToken } from '../middlewares/verifyToken'

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', registerHandler);
  app.post('/login', loginHandler);
  app.get('/me', { preHandler: verifyToken }, meHandler);
  app.patch('/me', { preHandler: verifyToken }, updateMeHandler);
  app.post('/forgot-password', forgotPasswordHandler);
  app.post('/reset-password', resetPasswordHandler);
}
