export default async function adminRoutes(fastify, options) {
  const { prisma } = fastify;

  // Ensure all admin endpoints require APPLICATION_MANAGER role
  fastify.addHook('preHandler', fastify.authenticate);
  fastify.addHook('preHandler', fastify.authorizeRoles('APPLICATION_MANAGER'));

  // GET /api/v1/admin/users - List all users
  fastify.get('/users', async (request, reply) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ success: true, data: users });
  });

  // GET /api/v1/admin/businesses - List all businesses with approval status
  fastify.get('/businesses', async (request, reply) => {
    const businesses = await prisma.business.findMany({
      include: {
        members: {
          include: {
            user: { select: { email: true, fullName: true } },
          },
        },
        subscription: {
          include: { plan: true },
        },
        _count: {
          select: { branches: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ success: true, data: businesses });
  });

  // PATCH /api/v1/admin/businesses/:businessId/status - Approve/Suspend/Reactivate
  fastify.patch('/businesses/:businessId/status', async (request, reply) => {
    const { businessId } = request.params;
    const { status } = request.body;

    if (!['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(status)) {
      return reply.code(400).send({ success: false, error: 'Invalid business status' });
    }

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: { status },
    });

    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        businessId,
        action: `BUSINESS_STATUS_${status}`,
        entityType: 'BUSINESS',
        entityId: businessId,
        details: `Business status changed to ${status} by Application Manager.`,
      },
    });

    return reply.send({ success: true, data: updated });
  });

  // GET /api/v1/admin/subscriptions - List all subscriptions
  fastify.get('/subscriptions', async (request, reply) => {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        business: true,
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ success: true, data: subscriptions });
  });

  // GET /api/v1/admin/audit-logs - View audit history
  fastify.get('/audit-logs', async (request, reply) => {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { email: true, fullName: true, role: true } },
        business: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return reply.send({ success: true, data: logs });
  });
}
