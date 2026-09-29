export default async function queueRoutes(fastify, options) {
  const { prisma } = fastify;

  // POST /api/v1/services/:serviceId/queues - Open new queue for service
  fastify.post(
    '/services/:serviceId/queues',
    { preHandler: [fastify.authenticate, fastify.authorizeRoles('BUSINESS_USER', 'APPLICATION_MANAGER')] },
    async (request, reply) => {
      const { serviceId } = request.params;
      const { title, maxCapacity } = request.body || {};

      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        include: { branch: true },
      });

      if (!service) {
        return reply.code(404).send({ success: false, error: 'Service not found' });
      }

      // Create new queue
      const queue = await prisma.queue.create({
        data: {
          serviceId,
          title: title || `${service.name} Queue`,
          status: 'OPEN',
          currentNumber: 0,
          maxCapacity: maxCapacity ? parseInt(maxCapacity, 10) : null,
        },
        include: {
          service: true,
        },
      });

      // Audit
      await prisma.auditLog.create({
        data: {
          userId: request.user.id,
          businessId: service.branch.businessId,
          action: 'QUEUE_OPENED',
          entityType: 'QUEUE',
          entityId: queue.id,
          details: `Queue "${queue.title}" opened.`,
        },
      });

      return reply.code(201).send({ success: true, data: queue });
    }
  );

  // GET /api/v1/queues/:queueId - View queue details + live stats
  fastify.get('/queues/:queueId', async (request, reply) => {
    const { queueId } = request.params;

    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        service: {
          include: {
            branch: {
              include: { business: true },
            },
          },
        },
        entries: {
          orderBy: { queueNumber: 'asc' },
        },
      },
    });

    if (!queue) {
      return reply.code(404).send({ success: false, error: 'Queue not found' });
    }

    const waitingEntries = queue.entries.filter((e) => e.status === 'WAITING' || e.status === 'CHECKED_IN');
    const servingEntry = queue.entries.find((e) => e.status === 'SERVING' || e.status === 'CALLED');

    const avgDuration = queue.service.avgDurationMinutes || 15;

    return reply.send({
      success: true,
      data: {
        ...queue,
        stats: {
          totalWaiting: waitingEntries.length,
          currentlyServing: servingEntry || null,
          estimatedWaitMinutes: waitingEntries.length * avgDuration,
        },
      },
    });
  });

  // POST /api/v1/queues/:queueId/join - Join Queue (Customer or Walk-in)
  fastify.post('/queues/:queueId/join', async (request, reply) => {
    const { queueId } = request.params;
    const { customerName, customerPhone, notes } = request.body || {};

    let userId = null;
    let name = customerName;
    let phone = customerPhone;

    // Optional auth check for logged-in customer
    try {
      await request.jwtVerify();
      userId = request.user.id;
      if (!name) name = request.user.fullName;
      if (!phone) phone = request.user.phone;
    } catch (e) {
      // Unauthenticated walk-in/remote guest
    }

    if (!name) {
      return reply.code(400).send({ success: false, error: 'Customer name is required' });
    }

    // Atomic transaction to ensure queue state and numbering consistency
    const result = await prisma.$transaction(async (tx) => {
      const queue = await tx.queue.findUnique({
        where: { id: queueId },
        include: { service: true },
      });

      if (!queue) {
        throw new Error('QUEUE_NOT_FOUND');
      }

      if (queue.status !== 'OPEN') {
        throw new Error('QUEUE_NOT_OPEN');
      }

      // Prevent duplicate active queue entries for the same registered user
      if (userId) {
        const existingEntry = await tx.queueEntry.findFirst({
          where: {
            queueId,
            userId,
            status: { in: ['WAITING', 'CALLED', 'CHECKED_IN', 'SERVING'] },
          },
        });
        if (existingEntry) {
          throw new Error('ALREADY_IN_QUEUE');
        }
      }

      // Check capacity
      if (queue.maxCapacity) {
        const currentActiveCount = await tx.queueEntry.count({
          where: {
            queueId,
            status: { in: ['WAITING', 'CALLED', 'CHECKED_IN', 'SERVING'] },
          },
        });
        if (currentActiveCount >= queue.maxCapacity) {
          throw new Error('QUEUE_CAPACITY_REACHED');
        }
      }

      // Highest queue number assigned today
      const lastEntry = await tx.queueEntry.findFirst({
        where: { queueId },
        orderBy: { queueNumber: 'desc' },
      });

      const nextQueueNumber = (lastEntry?.queueNumber || 0) + 1;

      // Count waiting customers ahead
      const peopleAhead = await tx.queueEntry.count({
        where: {
          queueId,
          status: { in: ['WAITING', 'CHECKED_IN'] },
        },
      });

      const avgDuration = queue.service.avgDurationMinutes || 15;
      const estimatedWait = peopleAhead * avgDuration;

      const entry = await tx.queueEntry.create({
        data: {
          queueId,
          userId,
          customerName: name,
          customerPhone: phone,
          queueNumber: nextQueueNumber,
          status: 'WAITING',
          estimatedWaitMinutes: estimatedWait,
          notes,
        },
      });

      // Log event
      await tx.queueEvent.create({
        data: {
          queueId,
          entryId: entry.id,
          eventType: 'JOINED',
          details: `Queue number #${nextQueueNumber} joined.`,
        },
      });

      return { entry, peopleAhead, estimatedWait };
    });

    // Broadcast real-time update
    if (fastify.broadcastQueueUpdate) {
      fastify.broadcastQueueUpdate(queueId, {
        type: 'CUSTOMER_JOINED',
        queueId,
        entry: result.entry,
      });
    }

    return reply.code(201).send({
      success: true,
      data: {
        entry: result.entry,
        peopleAhead: result.peopleAhead,
        estimatedWaitMinutes: result.estimatedWait,
      },
    });
  });

  // POST /api/v1/queues/:queueId/call-next - Concurrency-safe Call Next
  fastify.post(
    '/queues/:queueId/call-next',
    { preHandler: [fastify.authenticate, fastify.authorizeRoles('BUSINESS_USER', 'APPLICATION_MANAGER')] },
    async (request, reply) => {
      const { queueId } = request.params;

      // Safe transactional lock and atomic update
      const updatedEntry = await prisma.$transaction(async (tx) => {
        // Find next eligible waiting or checked-in customer
        const nextCustomer = await tx.queueEntry.findFirst({
          where: {
            queueId,
            status: { in: ['CHECKED_IN', 'WAITING'] },
          },
          orderBy: [
            { status: 'desc' }, // CHECKED_IN first
            { queueNumber: 'asc' },
          ],
        });

        if (!nextCustomer) {
          return null;
        }

        // Atomically set to CALLED
        const called = await tx.queueEntry.update({
          where: { id: nextCustomer.id },
          data: {
            status: 'CALLED',
            calledAt: new Date(),
          },
        });

        // Update queue current number
        await tx.queue.update({
          where: { id: queueId },
          data: { currentNumber: called.queueNumber },
        });

        // Create event
        await tx.queueEvent.create({
          data: {
            queueId,
            entryId: called.id,
            eventType: 'CALLED',
            details: `Customer #${called.queueNumber} (${called.customerName}) called to desk.`,
          },
        });

        return called;
      });

      if (!updatedEntry) {
        return reply.send({
          success: true,
          message: 'No waiting customers in queue.',
          data: null,
        });
      }

      // Broadcast real-time event
      if (fastify.broadcastQueueUpdate) {
        fastify.broadcastQueueUpdate(queueId, {
          type: 'CUSTOMER_CALLED',
          queueId,
          entry: updatedEntry,
        });
      }

      return reply.send({ success: true, data: updatedEntry });
    }
  );

  // POST /api/v1/queues/:queueId/pause - Pause Queue
  fastify.post(
    '/queues/:queueId/pause',
    { preHandler: [fastify.authenticate, fastify.authorizeRoles('BUSINESS_USER', 'APPLICATION_MANAGER')] },
    async (request, reply) => {
      const { queueId } = request.params;
      const updated = await prisma.queue.update({
        where: { id: queueId },
        data: { status: 'PAUSED' },
      });

      if (fastify.broadcastQueueUpdate) {
        fastify.broadcastQueueUpdate(queueId, { type: 'QUEUE_PAUSED', queueId });
      }

      return reply.send({ success: true, data: updated });
    }
  );

  // POST /api/v1/queues/:queueId/resume - Resume Queue
  fastify.post(
    '/queues/:queueId/resume',
    { preHandler: [fastify.authenticate, fastify.authorizeRoles('BUSINESS_USER', 'APPLICATION_MANAGER')] },
    async (request, reply) => {
      const { queueId } = request.params;
      const updated = await prisma.queue.update({
        where: { id: queueId },
        data: { status: 'OPEN' },
      });

      if (fastify.broadcastQueueUpdate) {
        fastify.broadcastQueueUpdate(queueId, { type: 'QUEUE_RESUMED', queueId });
      }

      return reply.send({ success: true, data: updated });
    }
  );

  // POST /api/v1/queues/:queueId/close - Close Queue
  fastify.post(
    '/queues/:queueId/close',
    { preHandler: [fastify.authenticate, fastify.authorizeRoles('BUSINESS_USER', 'APPLICATION_MANAGER')] },
    async (request, reply) => {
      const { queueId } = request.params;
      const updated = await prisma.queue.update({
        where: { id: queueId },
        data: { status: 'CLOSED' },
      });

      if (fastify.broadcastQueueUpdate) {
        fastify.broadcastQueueUpdate(queueId, { type: 'QUEUE_CLOSED', queueId });
      }

      return reply.send({ success: true, data: updated });
    }
  );

  // GET /api/v1/queues/:queueId/entries - List all entries
  fastify.get('/queues/:queueId/entries', async (request, reply) => {
    const { queueId } = request.params;
    const entries = await prisma.queueEntry.findMany({
      where: { queueId },
      orderBy: { queueNumber: 'asc' },
    });

    return reply.send({ success: true, data: entries });
  });
}
