function parseDateBounds(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let year, month, day;
  if (match) {
    year = parseInt(match[1], 10);
    month = parseInt(match[2], 10) - 1;
    day = parseInt(match[3], 10);
  } else {
    const d = new Date(str);
    if (isNaN(d.getTime())) return null;
    year = d.getFullYear();
    month = d.getMonth();
    day = d.getDate();
  }
  const start = new Date(year, month, day, 0, 0, 0, 0);
  const end = new Date(year, month, day, 23, 59, 59, 999);
  const dateObj = new Date(year, month, day, 12, 0, 0, 0);
  return { start, end, dateObj };
}

export default async function queueRoutes(fastify, options) {
  const { prisma } = fastify;

  // Helper to verify business ownership for a queue or service
  async function verifyQueueBusinessAccess(request, reply, businessId) {
    if (request.user.role === 'APPLICATION_MANAGER') return true;
    if (request.user.role !== 'BUSINESS_USER') {
      reply.code(403).send({ success: false, error: 'Requires BUSINESS_USER role' });
      return false;
    }
    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId: request.user.id,
          businessId,
        },
      },
    });
    if (!membership) {
      reply.code(403).send({ success: false, error: 'Forbidden: You do not manage this business' });
      return false;
    }
    return true;
  }

  // POST /api/v1/services/:serviceId/queues - Open new queue for service
  fastify.post(
    '/services/:serviceId/queues',
    { preHandler: [fastify.authenticate, fastify.authorizeRoles('BUSINESS_USER', 'APPLICATION_MANAGER')] },
    async (request, reply) => {
      const { serviceId } = request.params;
      const { title, maxCapacity, date } = request.body || {};

      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        include: { branch: true },
      });

      if (!service) {
        return reply.code(404).send({ success: false, error: 'Service not found' });
      }

      const isAllowed = await verifyQueueBusinessAccess(request, reply, service.branch.businessId);
      if (!isAllowed) return;

      const dateBounds = parseDateBounds(date);
      const targetDate = dateBounds ? dateBounds.dateObj : new Date();

      // Check if queue for this date already exists for this service
      if (dateBounds) {
        let existingQueue = await prisma.queue.findFirst({
          where: {
            serviceId,
            date: { gte: dateBounds.start, lte: dateBounds.end },
          },
          include: {
            service: true,
            entries: { orderBy: { queueNumber: 'asc' } },
          },
        });

        if (existingQueue) {
          if (existingQueue.status === 'CLOSED') {
            existingQueue = await prisma.queue.update({
              where: { id: existingQueue.id },
              data: { status: 'OPEN' },
              include: {
                service: true,
                entries: { orderBy: { queueNumber: 'asc' } },
              },
            });
          }
          return reply.code(200).send({ success: true, data: existingQueue });
        }
      }

      // Create new queue
      const queue = await prisma.queue.create({
        data: {
          serviceId,
          title: title || `${service.name} Queue`,
          status: 'OPEN',
          currentNumber: 0,
          maxCapacity: maxCapacity ? parseInt(maxCapacity, 10) : null,
          date: targetDate,
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
          details: `Queue "${queue.title}" opened for date ${targetDate.toISOString().split('T')[0]}.`,
        },
      });

      return reply.code(201).send({ success: true, data: queue });
    }
  );

  // Helper for joining queue transaction and notification logic
  async function processQueueJoin({ queueId, customerName, customerPhone, notes, isWalkIn, request, reply }) {
    let userId = null;
    let name = customerName;
    let phone = customerPhone;

    // Optional auth check: only attach userId if the authenticated user is a CUSTOMER joining for themselves
    try {
      await request.jwtVerify();
      if (!isWalkIn && request.user.role === 'CUSTOMER') {
        userId = request.user.id;
        if (!name) name = request.user.fullName;
        if (!phone) phone = request.user.phone;
      } else {
        userId = null;
      }
    } catch (e) {
      userId = null;
    }

    if (!name || !name.trim()) {
      return reply.code(400).send({ success: false, error: 'Customer name is required' });
    }

    try {
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

        // If registered customer already has an active ticket in this queue, return it idempotently
        if (userId) {
          const existingEntry = await tx.queueEntry.findFirst({
            where: {
              queueId,
              userId,
              status: { in: ['WAITING', 'CALLED', 'CHECKED_IN', 'SERVING'] },
            },
          });
          if (existingEntry) {
            const peopleAhead = await tx.queueEntry.count({
              where: {
                queueId,
                status: { in: ['WAITING', 'CHECKED_IN'] },
                queueNumber: { lt: existingEntry.queueNumber },
              },
            });
            const avgDuration = queue.service?.avgDurationMinutes || 15;
            const estimatedWait = peopleAhead * avgDuration;

            return { entry: existingEntry, peopleAhead, estimatedWait, alreadyActive: true };
          }
        } else if (phone) {
          const existingGuest = await tx.queueEntry.findFirst({
            where: {
              queueId,
              customerPhone: phone,
              status: { in: ['WAITING', 'CALLED', 'CHECKED_IN', 'SERVING'] },
            },
          });
          if (existingGuest) {
            const peopleAhead = await tx.queueEntry.count({
              where: {
                queueId,
                status: { in: ['WAITING', 'CHECKED_IN'] },
                queueNumber: { lt: existingGuest.queueNumber },
              },
            });
            const avgDuration = queue.service?.avgDurationMinutes || 15;
            const estimatedWait = peopleAhead * avgDuration;

            return { entry: existingGuest, peopleAhead, estimatedWait, alreadyActive: true };
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
            customerName: name.trim(),
            customerPhone: phone ? phone.trim() : null,
            queueNumber: nextQueueNumber,
            status: 'WAITING',
            estimatedWaitMinutes: estimatedWait,
            notes: notes || (isWalkIn ? 'Walk-in visitor' : undefined),
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

        return { entry, peopleAhead, estimatedWait, alreadyActive: false };
      });

      // Broadcast real-time update only for new joins
      if (!result.alreadyActive && fastify.broadcastQueueUpdate) {
        try {
          fastify.broadcastQueueUpdate(queueId, {
            type: 'CUSTOMER_JOINED',
            queueId,
            entry: result.entry,
          });
        } catch (wsErr) {
          fastify.log.warn({ err: wsErr }, 'WS broadcast error on join queue');
        }
      }

      return reply.code(result.alreadyActive ? 200 : 201).send({
        success: true,
        alreadyActive: !!result.alreadyActive,
        message: result.alreadyActive 
          ? `You are already in this queue with ticket #${result.entry.queueNumber}.` 
          : undefined,
        data: {
          entry: result.entry,
          peopleAhead: result.peopleAhead,
          estimatedWaitMinutes: result.estimatedWait,
        },
      });
    } catch (err) {
      if (err.message === 'QUEUE_NOT_FOUND') {
        return reply.code(404).send({ success: false, error: 'Queue not found.' });
      }
      if (err.message === 'QUEUE_NOT_OPEN') {
        return reply.code(400).send({ success: false, error: 'Queue is currently closed or paused.' });
      }
      if (err.message === 'ALREADY_IN_QUEUE') {
        return reply.code(400).send({ success: false, error: 'You are already in this queue with an active ticket.' });
      }
      if (err.message === 'QUEUE_CAPACITY_REACHED') {
        return reply.code(400).send({ success: false, error: 'Queue capacity limit has been reached for today.' });
      }
      throw err;
    }
  }

  // POST /api/v1/services/:serviceId/queues/join - Join or auto-create queue by service and date
  fastify.post('/services/:serviceId/queues/join', async (request, reply) => {
    const { serviceId } = request.params;
    const { customerName, customerPhone, notes, date, isWalkIn } = request.body || {};

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { branch: true },
    });

    if (!service) {
      return reply.code(404).send({ success: false, error: 'Service not found' });
    }

    const dateBounds = parseDateBounds(date);
    const targetDate = dateBounds ? dateBounds.dateObj : new Date();

    let queue = null;
    if (dateBounds) {
      queue = await prisma.queue.findFirst({
        where: {
          serviceId,
          date: { gte: dateBounds.start, lte: dateBounds.end },
        },
      });
    } else {
      queue = await prisma.queue.findFirst({
        where: {
          serviceId,
          status: 'OPEN',
        },
        orderBy: { date: 'desc' },
      });
    }

    if (!queue) {
      if (!service.isActive) {
        return reply.code(400).send({ success: false, error: 'Service is currently inactive' });
      }
      queue = await prisma.queue.create({
        data: {
          serviceId,
          title: `${service.name} Queue`,
          status: 'OPEN',
          currentNumber: 0,
          date: targetDate,
        },
      });
    }

    return processQueueJoin({
      queueId: queue.id,
      customerName,
      customerPhone,
      notes,
      isWalkIn,
      request,
      reply,
    });
  });

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
    const servingEntry = queue.entries
      .filter((e) => e.status === 'SERVING' || e.status === 'CALLED')
      .sort((a, b) => new Date(b.calledAt || 0) - new Date(a.calledAt || 0))[0] || null;

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
    const { customerName, customerPhone, notes, isWalkIn } = request.body || {};

    return processQueueJoin({
      queueId,
      customerName,
      customerPhone,
      notes,
      isWalkIn,
      request,
      reply,
    });
  });

  // POST /api/v1/queues/:queueId/call-next - Concurrency-safe Call Next
  fastify.post(
    '/queues/:queueId/call-next',
    { preHandler: [fastify.authenticate, fastify.authorizeRoles('BUSINESS_USER', 'APPLICATION_MANAGER')] },
    async (request, reply) => {
      const { queueId } = request.params;

      const queue = await prisma.queue.findUnique({
        where: { id: queueId },
        include: { service: { include: { branch: true } } },
      });

      if (!queue) {
        return reply.code(404).send({ success: false, error: 'Queue not found' });
      }

      const isAllowed = await verifyQueueBusinessAccess(request, reply, queue.service.branch.businessId);
      if (!isAllowed) return;

      // Safe transactional lock and atomic update
      const updatedEntry = await prisma.$transaction(async (tx) => {
        // Find next eligible waiting or checked-in customer in strict queueNumber ascending order
        const nextCustomer = await tx.queueEntry.findFirst({
          where: {
            queueId,
            status: { in: ['CHECKED_IN', 'WAITING'] },
          },
          orderBy: [
            { queueNumber: 'asc' },
          ],
        });

        if (!nextCustomer) {
          return null;
        }

        // Transition any current CALLED or SERVING customer in this queue to SERVED
        await tx.queueEntry.updateMany({
          where: {
            queueId,
            status: { in: ['CALLED', 'SERVING'] },
          },
          data: {
            status: 'SERVED',
            servedAt: new Date(),
          },
        });

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

        // Create persistent notification for user if registered
        if (called.userId) {
          await tx.notification.create({
            data: {
              userId: called.userId,
              title: "IT'S YOUR TURN!",
              message: `Your token #${called.queueNumber} has been called. Please proceed to the service desk immediately.`,
              type: 'QUEUE_CALLED',
            },
          });
        }

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
      const queue = await prisma.queue.findUnique({
        where: { id: queueId },
        include: { service: { include: { branch: true } } },
      });
      if (!queue) return reply.code(404).send({ success: false, error: 'Queue not found' });

      const isAllowed = await verifyQueueBusinessAccess(request, reply, queue.service.branch.businessId);
      if (!isAllowed) return;

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
      const queue = await prisma.queue.findUnique({
        where: { id: queueId },
        include: { service: { include: { branch: true } } },
      });
      if (!queue) return reply.code(404).send({ success: false, error: 'Queue not found' });

      const isAllowed = await verifyQueueBusinessAccess(request, reply, queue.service.branch.businessId);
      if (!isAllowed) return;

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
      const queue = await prisma.queue.findUnique({
        where: { id: queueId },
        include: { service: { include: { branch: true } } },
      });
      if (!queue) return reply.code(404).send({ success: false, error: 'Queue not found' });

      const isAllowed = await verifyQueueBusinessAccess(request, reply, queue.service.branch.businessId);
      if (!isAllowed) return;

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
