// routes/registry.ts
import { FastifyInstance } from 'fastify';
import { listRegistryHandler } from '../handlers/registry/list';
import { getRegistryProfileHandler } from '../handlers/registry/profile';

export async function registryRoutes(app: FastifyInstance) {
  app.get('/registry', listRegistryHandler);
  app.get('/registry/:userId', getRegistryProfileHandler);
}
