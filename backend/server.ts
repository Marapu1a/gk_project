import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import dotenv from 'dotenv';

dotenv.config();

const app = Fastify();

app.register(cors, { origin: true, credentials: true });
app.register(cookie);

app.get('/ping', async () => {
  return { message: 'pong from fastify' };
});

const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
    console.log('🚀 Fastify server is running');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
