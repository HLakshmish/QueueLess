export default async function queueEntryRoutes(fastify, options) {
  const { prisma } = fastify;

  // Helper to verify business membership for a queue entry
  async function verifyEntryBusinessAccess(user, entryId) {
    if (user.role === 'APPLICATION_MANAGER') return true;
    if (user.role !== 'BUSINESS_USER') return false;

    const entry = await prisma.queueEntry.findUnique({
      where: { id: entryId },
      include: {
        queue: {
          include: {
            service: {
              include: { branch: true },
            },
          },
        },
      },
    });

    if (!entry) return false;

    const businessId = entry.queue.service.branch.businessId;
    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId: user.id,
          businessId,
        },
      },
    });

    return !!membership;
  }

  // Helper to re-calculate customer position and estimated wait
  async function getCustomerPosition(queueId, entryId, queueNumber) {
    const peopleAhead = await prisma.queueEntry.count({
      where: {
        queueId,
        status: { in: ['WAITING', 'CHECKED_IN'] },
        queueNumber: { lt: queueNumber },
      },
    });

    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: { service: true },
    });

    const avgDuration = queue?.service?.avgDurationMinutes || 15;
    return {
      peopleAhead,
      estimatedWaitMinutes: peopleAhead * avgDuration,
    };
  }

  // GET /api/v1/queue-entries/:entryId - View entry with position calculation
  fastify.get('/:entryId', async (request, reply) => {
    const { entryId } = request.params;

    const entry = await prisma.queueEntry.findUnique({
      where: { id: entryId },
      include: {
        queue: {
          include: {
            service: {
              include: {
                branch: {
                  include: { business: true },
                },
              },
            },
          },
        },
      },
    });

    if (!entry) {
      return reply.code(404).send({ success: false, error: 'Queue entry not found' });
    }

    const { peopleAhead, estimatedWaitMinutes } = await getCustomerPosition(
      entry.queueId,
      entry.id,
      entry.queueNumber
    );

    return reply.send({
      success: true,
      data: {
        ...entry,
        peopleAhead,
        estimatedWaitMinutes,
      },
    });
  });

  // POST /api/v1/queue-entries/:entryId/check-in - Customer Check-in
  fastify.post('/:entryId/check-in', async (request, reply) => {
    const { entryId } = request.params;

    const entry = await prisma.queueEntry.findUnique({ where: { id: entryId } });
    if (!entry) {
      return reply.code(404).send({ success: false, error: 'Queue entry not found' });
    }

    // Auth verification (customer or desk staff)
    try {
      await request.jwtVerify();
      const user = request.user;
      const isOwner = entry.userId === user.id;
      const isStaff = await verifyEntryBusinessAccess(user, entryId);
      if (!isOwner && !isStaff) {
        return reply.code(403).send({ success: false, error: 'Forbidden' });
      }
    } catch (e) {
      // Allow unauthenticated guest check-in if guest ticket (userId is null)
      if (entry.userId !== null) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }
    }

    const updated = await prisma.queueEntry.update({
      where: { id: entryId },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: new Date(),
      },
    });

    await prisma.queueEvent.create({
      data: {
        queueId: entry.queueId,
        entryId: entry.id,
        eventType: 'CHECKED_IN',
        details: `Customer #${entry.queueNumber} checked in on site.`,
      },
    });

    if (fastify.broadcastQueueUpdate) {
      fastify.broadcastQueueUpdate(entry.queueId, {
        type: 'CUSTOMER_CHECKED_IN',
        entry: updated,
      });
    }

    return reply.send({ success: true, data: updated });
  });

  // POST /api/v1/queue-entries/:entryId/serve - Mark Served
  fastify.post(
    '/:entryId/serve',
    { preHandler: [fastify.authenticate, fastify.authorizeRoles('BUSINESS_USER', 'APPLICATION_MANAGER')] },
    async (request, reply) => {
      const { entryId } = request.params;

      const hasAccess = await verifyEntryBusinessAccess(request.user, entryId);
      if (!hasAccess) {
        return reply.code(403).send({ success: false, error: 'Forbidden: You do not manage this business queue' });
      }

      const entry = await prisma.queueEntry.findUnique({ where: { id: entryId } });
      if (!entry) {
        return reply.code(404).send({ success: false, error: 'Queue entry not found' });
      }

      const updated = await prisma.queueEntry.update({
        where: { id: entryId },
        data: {
          status: 'SERVED',
          servedAt: new Date(),
        },
      });

      await prisma.queueEvent.create({
        data: {
          queueId: entry.queueId,
          entryId: entry.id,
          eventType: 'SERVED',
          details: `Service completed for customer #${entry.queueNumber}.`,
        },
      });

      if (fastify.broadcastQueueUpdate) {
        fastify.broadcastQueueUpdate(entry.queueId, {
          type: 'CUSTOMER_SERVED',
          entry: updated,
        });
      }

      return reply.send({ success: true, data: updated });
    }
  );

  // POST /api/v1/queue-entries/:entryId/skip - Skip Customer
  fastify.post(
    '/:entryId/skip',
    { preHandler: [fastify.authenticate, fastify.authorizeRoles('BUSINESS_USER', 'APPLICATION_MANAGER')] },
    async (request, reply) => {
      const { entryId } = request.params;

      const hasAccess = await verifyEntryBusinessAccess(request.user, entryId);
      if (!hasAccess) {
        return reply.code(403).send({ success: false, error: 'Forbidden: You do not manage this business queue' });
      }

      const entry = await prisma.queueEntry.findUnique({ where: { id: entryId } });
      if (!entry) {
        return reply.code(404).send({ success: false, error: 'Queue entry not found' });
      }

      const updated = await prisma.queueEntry.update({
        where: { id: entryId },
        data: {
          status: 'SKIPPED',
        },
      });

      await prisma.queueEvent.create({
        data: {
          queueId: entry.queueId,
          entryId: entry.id,
          eventType: 'SKIPPED',
          details: `Customer #${entry.queueNumber} skipped.`,
        },
      });

      if (fastify.broadcastQueueUpdate) {
        fastify.broadcastQueueUpdate(entry.queueId, {
          type: 'CUSTOMER_SKIPPED',
          entry: updated,
        });
      }

      return reply.send({ success: true, data: updated });
    }
  );

  // POST /api/v1/queue-entries/:entryId/recall - Recall Skipped Customer
  fastify.post(
    '/:entryId/recall',
    { preHandler: [fastify.authenticate, fastify.authorizeRoles('BUSINESS_USER', 'APPLICATION_MANAGER')] },
    async (request, reply) => {
      const { entryId } = request.params;

      const hasAccess = await verifyEntryBusinessAccess(request.user, entryId);
      if (!hasAccess) {
        return reply.code(403).send({ success: false, error: 'Forbidden: You do not manage this business queue' });
      }

      const entry = await prisma.queueEntry.findUnique({ where: { id: entryId } });
      if (!entry) {
        return reply.code(404).send({ success: false, error: 'Queue entry not found' });
      }

      // Mark any currently called/serving customer as served
      await prisma.queueEntry.updateMany({
        where: {
          queueId: entry.queueId,
          status: { in: ['CALLED', 'SERVING'] },
        },
        data: {
          status: 'SERVED',
          servedAt: new Date(),
        },
      });

      const updated = await prisma.queueEntry.update({
        where: { id: entryId },
        data: {
          status: 'CALLED',
          calledAt: new Date(),
        },
      });

      await prisma.queueEvent.create({
        data: {
          queueId: entry.queueId,
          entryId: entry.id,
          eventType: 'RECALLED',
          details: `Customer #${entry.queueNumber} recalled to desk.`,
        },
      });

      // Persistent notification if registered user
      if (entry.userId) {
        await prisma.notification.create({
          data: {
            userId: entry.userId,
            title: "RECALLED TO DESK!",
            message: `Your token #${entry.queueNumber} has been recalled. Please proceed to the desk immediately.`,
            type: 'QUEUE_CALLED',
          },
        });
      }

      if (fastify.broadcastQueueUpdate) {
        fastify.broadcastQueueUpdate(entry.queueId, {
          type: 'CUSTOMER_CALLED',
          entry: updated,
        });
      }

      return reply.send({ success: true, data: updated });
    }
  );

  // POST /api/v1/queue-entries/:entryId/cancel - Cancel entry
  fastify.post('/:entryId/cancel', async (request, reply) => {
    const { entryId } = request.params;

    const entry = await prisma.queueEntry.findUnique({ where: { id: entryId } });
    if (!entry) {
      return reply.code(404).send({ success: false, error: 'Queue entry not found' });
    }

    // Auth verification (customer or desk staff)
    try {
      await request.jwtVerify();
      const user = request.user;
      const isOwner = entry.userId === user.id;
      const isStaff = await verifyEntryBusinessAccess(user, entryId);
      if (!isOwner && !isStaff) {
        return reply.code(403).send({ success: false, error: 'Forbidden' });
      }
    } catch (e) {
      if (entry.userId !== null) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }
    }

    const updated = await prisma.queueEntry.update({
      where: { id: entryId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    await prisma.queueEvent.create({
      data: {
        queueId: entry.queueId,
        entryId: entry.id,
        eventType: 'CANCELLED',
        details: `Queue entry #${entry.queueNumber} cancelled.`,
      },
    });

    if (fastify.broadcastQueueUpdate) {
      fastify.broadcastQueueUpdate(entry.queueId, {
        type: 'CUSTOMER_CANCELLED',
        entry: updated,
      });
    }

    return reply.send({ success: true, data: updated });
  });

  // GET /api/v1/queue-entries/customer/history - Logged-in customer queue history
  fastify.get(
    '/customer/history',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const history = await prisma.queueEntry.findMany({
        where: { userId: request.user.id },
        include: {
          queue: {
            include: {
              service: {
                include: {
                  branch: {
                    include: { business: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({ success: true, data: history });
    }
  );
}
