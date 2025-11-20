// src/routes/location.ts
import { FastifyInstance } from 'fastify';
import { registerCustomCityHandler } from '../handlers/location/registerCustomCityHandler';
import { deleteCustomCityHandler } from '../handlers/location/deleteCustomCityHandler';
import { verifyToken } from '../middlewares/verifyToken';

export async function locationRoutes(app: FastifyInstance) {
  app.post(
    '/location/custom-city',
    { preHandler: verifyToken },
    registerCustomCityHandler,
  );

  app.delete(
    '/location/custom-city',
    { preHandler: verifyToken },
    deleteCustomCityHandler,
  );
}
