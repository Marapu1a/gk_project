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
import { cycleRoutes } from './routes/cycleRoutes';
import { backupRoutes } from './routes/backup';
import { locationRoutes } from './routes/location';
import { userBannerRoutes } from './routes/userBanner';
import { specialistContactMessagesRoutes } from './routes/specialistContactMessages';
import { healthRoutes } from './routes/health';
import { MAX_FILE_SIZE_MB, UPLOAD_ROOT } from './config/storage';
import { startCertificateLifecycleScheduler } from './utils/certificateLifecycleNotifications';
import {
  initializeErrorMonitoring,
  reportOperationalFailure,
  setOperationalLogger,
} from './lib/errorMonitoring';

dotenv.config()

initializeErrorMonitoring();

const logLevel = process.env.LOG_LEVEL?.trim() ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const app = Fastify({
  logger: {
    level: logLevel,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers.set-cookie',
        'password',
        'token',
      ],
      censor: '[REDACTED]',
    },
  },
})

setOperationalLogger(app.log);

app.addHook('onRequest', async (req, reply) => {
  reply.header('X-Request-Id', req.id);
});

app.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

app.register(multipart, {
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, // 10 MB
  },
});

const STATIC_UPLOADS_ROOT = UPLOAD_ROOT;

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
app.register(cycleRoutes);
app.register(backupRoutes);
app.register(locationRoutes);
app.register(userBannerRoutes);
app.register(specialistContactMessagesRoutes);
app.register(healthRoutes);

app.get('/', async () => ({ ok: true }))

const PORT = process.env.PORT || 3000

app.setErrorHandler((error, req, reply) => {
  if (error.code === 'FST_REQ_FILE_TOO_LARGE') {
    return reply.code(413).send({ error: `Файл превышает ${MAX_FILE_SIZE_MB}MB` });
  }

  const statusCode = error.statusCode && error.statusCode >= 400
    ? error.statusCode
    : 500;

  if (statusCode < 500) {
    return reply.code(statusCode).send({ error: error.message });
  }

  reportOperationalFailure(
    'unhandled_request',
    error,
    {
      requestId: req.id,
      method: req.method,
      route: req.routeOptions.url,
      statusCode,
    },
    req.log,
  );

  return reply.code(statusCode).send({
    error: 'Внутренняя ошибка сервера',
    requestId: req.id,
  });
});

app.listen({ port: +PORT, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  app.log.info({ address, logLevel }, 'Server listening')
  startCertificateLifecycleScheduler(app.log)
})
