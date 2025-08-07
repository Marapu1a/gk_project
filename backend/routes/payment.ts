import { FastifyInstance } from 'fastify';
import { getPaymentsByUserHandler } from '../handlers/payment/getPaymentsByUserHandler';
import { updatePaymentStatusHandler } from '../handlers/payment/updatePaymentStatusHandler';
import { getPaymentsByUserIdHandler } from '../handlers/payment/getPaymentsByUserIdHandler';
import { verifyToken } from '../middlewares/verifyToken';

export async function paymentRoutes(app: FastifyInstance) {
  app.get('/payment', { preHandler: verifyToken }, getPaymentsByUserHandler);
  app.patch('/payment/:id', { preHandler: verifyToken }, updatePaymentStatusHandler);
  app.get('/payment/user/:userId', { preHandler: verifyToken }, getPaymentsByUserIdHandler);
}
