export default async function notificationRoutes(fastify, options) {
  const { prisma } = fastify;

  fastify.addHook('preHandler', fastify.authenticate);

  // GET /api/v1/notifications - Get logged-in user notifications
  fastify.get('/', async (request, reply) => {
    try {
      if (!request.user || !request.user.id) {
        return reply.code(401).send({ success: false, error: 'Unauthorized: User not authenticated' });
      }

      const notifications = await prisma.notification.findMany({
        where: { userId: request.user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return reply.send({ success: true, data: notifications });
    } catch (err) {
      fastify.log.error(err, 'Failed fetching notifications');
      // If table missing, attempt creation and return empty array gracefully
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "notifications" (
            "id" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "message" TEXT NOT NULL,
            "isRead" BOOLEAN NOT NULL DEFAULT false,
            "type" TEXT NOT NULL DEFAULT 'QUEUE_UPDATE',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
          );
        `);
      } catch (createErr) {
        // ignore
      }
      return reply.send({ success: true, data: [] });
    }
  });

  // PATCH /api/v1/notifications/:id/read - Mark as read
  fastify.patch('/:id/read', async (request, reply) => {
    try {
      if (!request.user || !request.user.id) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }
      const { id } = request.params;
      const notification = await prisma.notification.updateMany({
        where: { id, userId: request.user.id },
        data: { isRead: true },
      });
      return reply.send({ success: true, data: notification });
    } catch (err) {
      return reply.send({ success: true, data: { count: 0 } });
    }
  });
}
