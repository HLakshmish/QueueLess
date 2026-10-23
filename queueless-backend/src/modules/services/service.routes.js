export default async function serviceRoutes(fastify, options) {
  const { prisma } = fastify;

  // Helper to verify business membership for a branch
  async function verifyBranchAccess(request, reply, branchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: { business: true },
    });
    if (!branch) {
      reply.code(404).send({ success: false, error: 'Branch not found' });
      return null;
    }
    if (request.user.role === 'APPLICATION_MANAGER') return branch;
    if (request.user.role !== 'BUSINESS_USER') {
      reply.code(403).send({ success: false, error: 'Requires BUSINESS_USER role' });
      return null;
    }
    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId: request.user.id,
          businessId: branch.businessId,
        },
      },
    });
    if (!membership) {
      reply.code(403).send({ success: false, error: 'Forbidden: You do not manage this branch' });
      return null;
    }
    return branch;
  }

  // Helper to verify business membership for a service
  async function verifyServiceAccess(request, reply, serviceId) {
    if (request.user.role === 'APPLICATION_MANAGER') return true;
    if (request.user.role !== 'BUSINESS_USER') {
      reply.code(403).send({ success: false, error: 'Requires BUSINESS_USER role' });
      return false;
    }
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { branch: true },
    });
    if (!service) {
      reply.code(404).send({ success: false, error: 'Service not found' });
      return false;
    }
    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId: request.user.id,
          businessId: service.branch.businessId,
        },
      },
    });
    if (!membership) {
      reply.code(403).send({ success: false, error: 'Forbidden: You do not manage this service' });
      return false;
    }
    return service;
  }

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

      const branch = await verifyBranchAccess(request, reply, branchId);
      if (!branch) return;

      const service = await prisma.service.create({
        data: {
          branchId,
          name: name.trim(),
          description: description ? description.trim() : null,
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

  // PATCH /api/v1/branches/:branchId - Update branch
  fastify.patch(
    '/branches/:branchId',
    { preHandler: [fastify.authenticate, fastify.authorizeRoles('BUSINESS_USER', 'APPLICATION_MANAGER')] },
    async (request, reply) => {
      try {
        const { branchId } = request.params;
        const branch = await verifyBranchAccess(request, reply, branchId);
        if (reply.sent) return;
        if (!branch) return reply.code(404).send({ success: false, error: 'Branch not found' });

        const { name, address, city, state, postalCode, phone, imageUrl } = request.body || {};

        // Auto-ensure imageUrl column exists on branches table
        try {
          await prisma.$executeRawUnsafe('ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;');
        } catch (colErr) {
          // ignore
        }

        let updated;
        try {
          updated = await prisma.branch.update({
            where: { id: branchId },
            data: {
              name: name ? name.trim() : undefined,
              address: address ? address.trim() : undefined,
              city: city ? city.trim() : undefined,
              state: state !== undefined ? state : undefined,
              postalCode: postalCode !== undefined ? postalCode : undefined,
              phone: phone !== undefined ? phone : undefined,
              imageUrl: imageUrl !== undefined ? (imageUrl ? imageUrl.trim() : null) : undefined,
            },
          });
        } catch (err) {
          fastify.log.warn('Standard branch update failed, attempting raw update fallback: ' + err.message);
          try {
            await prisma.$executeRawUnsafe(
              `UPDATE "branches" SET 
                "name" = COALESCE($1, "name"), 
                "address" = COALESCE($2, "address"), 
                "city" = COALESCE($3, "city"),
                "imageUrl" = COALESCE($4, "imageUrl"),
                "updatedAt" = CURRENT_TIMESTAMP
               WHERE "id" = $5`,
              name ? name.trim() : null,
              address ? address.trim() : null,
              city ? city.trim() : null,
              imageUrl !== undefined ? (imageUrl ? imageUrl.trim() : null) : null,
              branchId
            );
            updated = await prisma.branch.findUnique({ where: { id: branchId } });
          } catch (rawErr) {
            updated = await prisma.branch.update({
              where: { id: branchId },
              data: {
                name: name ? name.trim() : undefined,
                address: address ? address.trim() : undefined,
                city: city ? city.trim() : undefined,
                state: state !== undefined ? state : undefined,
                postalCode: postalCode !== undefined ? postalCode : undefined,
                phone: phone !== undefined ? phone : undefined,
              },
            });
          }
        }

        return reply.send({ success: true, data: updated });
      } catch (err) {
        fastify.log.error(err, 'Failed updating branch');
        return reply.code(500).send({ success: false, error: err.message || 'Failed to update branch' });
      }
    }
  );

  // DELETE /api/v1/branches/:branchId - Delete branch
  fastify.delete(
    '/branches/:branchId',
    { preHandler: [fastify.authenticate, fastify.authorizeRoles('BUSINESS_USER', 'APPLICATION_MANAGER')] },
    async (request, reply) => {
      const { branchId } = request.params;
      const branch = await verifyBranchAccess(request, reply, branchId);
      if (!branch) return;

      const branchCount = await prisma.branch.count({
        where: { businessId: branch.businessId },
      });

      if (branchCount <= 1) {
        return reply.code(400).send({
          success: false,
          error: 'Cannot delete your only branch location. Businesses must have at least one branch.',
        });
      }

      await prisma.branch.delete({
        where: { id: branchId },
      });

      return reply.send({ success: true, message: 'Branch location deleted successfully.' });
    }
  );

  // PATCH /api/v1/services/:serviceId - Update service
  fastify.patch(
    '/services/:serviceId',
    { preHandler: [fastify.authenticate, fastify.authorizeRoles('BUSINESS_USER', 'APPLICATION_MANAGER')] },
    async (request, reply) => {
      const { serviceId } = request.params;
      const service = await verifyServiceAccess(request, reply, serviceId);
      if (!service) return;

      const { name, description, avgDurationMinutes, isActive } = request.body || {};

      const updated = await prisma.service.update({
        where: { id: serviceId },
        data: {
          name: name ? name.trim() : undefined,
          description: description !== undefined ? description : undefined,
          avgDurationMinutes: avgDurationMinutes ? parseInt(avgDurationMinutes, 10) : undefined,
          isActive: isActive !== undefined ? isActive : undefined,
        },
      });

      return reply.send({ success: true, data: updated });
    }
  );

  // DELETE /api/v1/services/:serviceId - Delete service
  fastify.delete(
    '/services/:serviceId',
    { preHandler: [fastify.authenticate, fastify.authorizeRoles('BUSINESS_USER', 'APPLICATION_MANAGER')] },
    async (request, reply) => {
      const { serviceId } = request.params;
      const service = await verifyServiceAccess(request, reply, serviceId);
      if (!service) return;

      await prisma.service.delete({
        where: { id: serviceId },
      });

      return reply.send({ success: true, message: 'Service desk deleted successfully.' });
    }
  );
}
