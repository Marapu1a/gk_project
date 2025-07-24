import { FastifyInstance } from 'fastify';
import { getNotificationsHandler } from '../handlers/notifications/getNotificationsHandler';
import { createNotificationHandler } from '../handlers/notifications/createNotificationHandler';
import { deleteNotificationHandler } from '../handlers/notifications/deleteNotificationHandler';

import { verifyToken } from '../middlewares/verifyToken';

export async function notificationsRoutes(app: FastifyInstance) {
  app.get('/notifications', { preHandler: [verifyToken] }, getNotificationsHandler);
  app.post('/notifications', { preHandler: [verifyToken] }, createNotificationHandler);
  app.delete('/notifications/:id', { preHandler: [verifyToken] }, deleteNotificationHandler);
}
