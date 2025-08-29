import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import dotenv from 'dotenv'

import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';

import { authRoutes } from './routes/auth'
import { ceuRoutes } from './routes/ceu'
import { supervisionRoutes } from './routes/supervision'
import { certificatesRoutes } from './routes/certificates';
import { groupsRoutes } from './routes/groups'
import { documentReviewRoutes } from './routes/documentReview';
import { documentReviewRoutesAdmin } from './routes/documentReviewAdmin';
import { uploadRoutes } from './routes/upload';
import { usersRoutes } from './routes/admin';
import { notificationsRoutes } from './routes/notifications';
import { moderatorsRoutes } from './routes/users';
import { paymentRoutes } from './routes/payment';
import { examApplicationRoutes } from './routes/examApplications';
import { registryRoutes } from './routes/registry';
import { backupRoutes } from './routes/backup';

dotenv.config()

const app = Fastify()

app.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

app.register(multipart, {
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
  },
});

const STATIC_UPLOADS_ROOT =
  process.env.UPLOAD_DIR ||
  path.resolve(process.cwd(), '..', 'frontend', 'public', 'uploads');

app.register(fastifyStatic, {
  root: STATIC_UPLOADS_ROOT,
  prefix: '/uploads/',
  decorateReply: false,
  etag: true,
});

app.register(cookie);
app.register(authRoutes, { prefix: '/auth' });
app.register(ceuRoutes);
app.register(supervisionRoutes);
app.register(uploadRoutes);
app.register(certificatesRoutes);
app.register(groupsRoutes);
app.register(documentReviewRoutes);
app.register(documentReviewRoutesAdmin);
app.register(usersRoutes);
app.register(notificationsRoutes);
app.register(moderatorsRoutes);
app.register(paymentRoutes);
app.register(examApplicationRoutes);
app.register(registryRoutes);
app.register(backupRoutes);

app.get('/', async () => ({ ok: true }))

const PORT = process.env.PORT || 3000

app.listen({ port: +PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`🚀 Server listening at ${address}`)
})
