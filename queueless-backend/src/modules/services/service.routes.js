export default async function serviceRoutes(fastify, options) {
  const { prisma } = fastify;

  // POST /api/v1/branches/:branchId/services - Create service
  fastify.post(
    '/branches/:branchId/services',
    { preHandler: [fastify.authenticate, fastify.authorizeRoles('BUSINESS_USER', 'APPLICATION_MANAGER')] },
    async (request, reply) => {
      const { branchId } = request.params;
      const { name, description, avgDurationMinutes } = request.body;

      if (!name) {
        return reply.code(400).send({ success: false, error: 'Service name is required' });
      }

      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        include: { business: true },
      });

      if (!branch) {
        return reply.code(404).send({ success: false, error: 'Branch not found' });
      }

      // Check user membership if business user
      if (request.user.role === 'BUSINESS_USER') {
        const membership = await prisma.businessMember.findUnique({
          where: {
            userId_businessId: {
              userId: request.user.id,
              businessId: branch.businessId,
            },
          },
        });
        if (!membership) {
          return reply.code(403).send({ success: false, error: 'Forbidden' });
        }
      }

      const service = await prisma.service.create({
        data: {
          branchId,
          name,
          description,
          avgDurationMinutes: avgDurationMinutes ? parseInt(avgDurationMinutes, 10) : 15,
        },
      });

      return reply.code(201).send({ success: true, data: service });
    }
  );

  // GET /api/v1/branches/:branchId/services - List branch services
  fastify.get('/branches/:branchId/services', async (request, reply) => {
    const { branchId } = request.params;
    const services = await prisma.service.findMany({
      where: { branchId, isActive: true },
      include: {
        queues: {
          where: { status: 'OPEN' },
        },
      },
    });

    return reply.send({ success: true, data: services });
  });

  // PATCH /api/v1/services/:serviceId - Update service
  fastify.patch(
    '/services/:serviceId',
    { preHandler: [fastify.authenticate, fastify.authorizeRoles('BUSINESS_USER', 'APPLICATION_MANAGER')] },
    async (request, reply) => {
      const { serviceId } = request.params;
      const { name, description, avgDurationMinutes, isActive } = request.body;

      const service = await prisma.service.update({
        where: { id: serviceId },
        data: {
          name,
          description,
          avgDurationMinutes: avgDurationMinutes ? parseInt(avgDurationMinutes, 10) : undefined,
          isActive,
        },
      });

      return reply.send({ success: true, data: service });
    }
  );
}
