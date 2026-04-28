// routes/notificationsRoutes.ts
import { FastifyInstance } from 'fastify';
import { getNotificationsHandler } from '../handlers/notifications/getNotificationsHandler';
import { deleteNotificationHandler } from '../handlers/notifications/deleteNotificationHandler';
import { markNotificationReadHandler } from '../handlers/notifications/markNotificationReadHandler';
import { verifyToken } from '../middlewares/verifyToken';

export async function notificationsRoutes(app: FastifyInstance) {
  app.get('/notifications', { preHandler: [verifyToken] }, getNotificationsHandler);
  app.delete('/notifications/:id', { preHandler: [verifyToken] }, deleteNotificationHandler);

  // пометить уведомление как прочитанное
  app.patch(
    '/notifications/:id/read',
    { preHandler: [verifyToken] },
    markNotificationReadHandler,
  );
}
