import { FastifyInstance } from 'fastify';
import { verifyToken } from '../middlewares/verifyToken';
import { listSpecialistContactMessagesHandler } from '../handlers/specialistContactMessages/list';
import { markSpecialistContactMessageReadHandler } from '../handlers/specialistContactMessages/markRead';
import { deleteSpecialistContactMessageHandler } from '../handlers/specialistContactMessages/delete';

export async function specialistContactMessagesRoutes(app: FastifyInstance) {
  app.get('/specialist-contact-messages', { preHandler: [verifyToken] }, listSpecialistContactMessagesHandler);
  app.patch<{ Params: { id: string } }>(
    '/specialist-contact-messages/:id/read',
    { preHandler: [verifyToken] },
    markSpecialistContactMessageReadHandler,
  );
  app.delete<{ Params: { id: string } }>(
    '/specialist-contact-messages/:id',
    { preHandler: [verifyToken] },
    deleteSpecialistContactMessageHandler,
  );
}
