// routes/registry.ts
import { FastifyInstance } from 'fastify';
import { listRegistryHandler } from '../handlers/registry/list';
import { getRegistryProfileHandler } from '../handlers/registry/profile';
import { createSpecialistContactMessageHandler } from '../handlers/registry/contact';

export async function registryRoutes(app: FastifyInstance) {
  app.get('/registry', listRegistryHandler);
  app.post('/registry/:userId/contact', createSpecialistContactMessageHandler);
  app.get('/registry/:userId', getRegistryProfileHandler);
}
