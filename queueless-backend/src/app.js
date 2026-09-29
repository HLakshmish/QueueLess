import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifySensible from '@fastify/sensible';
import fastifyRateLimit from '@fastify/rate-limit';

import prismaPlugin from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';
import websocketPlugin from './plugins/websocket.js';
import { config } from './config/index.js';

// Module Routes
import authRoutes from './modules/auth/auth.routes.js';
import businessRoutes from './modules/businesses/business.routes.js';
import serviceRoutes from './modules/services/service.routes.js';
import queueRoutes from './modules/queues/queue.routes.js';
import queueEntryRoutes from './modules/queueEntries/queueEntry.routes.js';
import subscriptionRoutes from './modules/subscriptions/subscription.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: true,
  });

  // CORS
  await fastify.register(fastifyCors, {
    origin: true, // Allow frontend during development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Allow empty body when content-type is application/json
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, function (req, body, done) {
    if (!body || typeof body !== 'string' || body.trim() === '') {
      done(null, {});
      return;
    }
    try {
      const json = JSON.parse(body);
      done(null, json);
    } catch (err) {
      err.statusCode = 400;
      done(err, undefined);
    }
  });

  // Sensible helpers
  await fastify.register(fastifySensible);

  // Rate Limiter
  await fastify.register(fastifyRateLimit, {
    max: 200,
    timeWindow: '1 minute',
  });

  // Core Plugins
  await fastify.register(prismaPlugin);
  await fastify.register(authPlugin);
  await fastify.register(websocketPlugin);

  // Health Check
  fastify.get('/api/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  // Register API v1 modules
  fastify.register(
    async (v1) => {
      v1.register(authRoutes, { prefix: '/auth' });
      v1.register(businessRoutes, { prefix: '/businesses' });
      v1.register(serviceRoutes, { prefix: '' });
      v1.register(queueRoutes, { prefix: '' });
      v1.register(queueEntryRoutes, { prefix: '/queue-entries' });
      v1.register(subscriptionRoutes, { prefix: '/subscriptions' });
      v1.register(analyticsRoutes, { prefix: '/analytics' });
      v1.register(adminRoutes, { prefix: '/admin' });
      v1.register(notificationRoutes, { prefix: '/notifications' });
    },
    { prefix: '/api/v1' }
  );

  return fastify;
}
