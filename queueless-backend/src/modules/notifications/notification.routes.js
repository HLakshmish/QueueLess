export default async function notificationRoutes(fastify, options) {
  const { prisma } = fastify;

  fastify.addHook('preHandler', fastify.authenticate);

  // GET /api/v1/notifications - Get logged-in user notifications
  fastify.get('/', async (request, reply) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: request.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return reply.send({ success: true, data: notifications });
  });

  // PATCH /api/v1/notifications/:id/read - Mark as read
  fastify.patch('/:id/read', async (request, reply) => {
    const { id } = request.params;
    const notification = await prisma.notification.updateMany({
      where: { id, userId: request.user.id },
      data: { isRead: true },
    });
    return reply.send({ success: true, data: notification });
  });
}
