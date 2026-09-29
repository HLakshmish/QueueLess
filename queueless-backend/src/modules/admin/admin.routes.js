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

  // --- SUBSCRIPTION PLANS CRUD (ADMIN) ---

  // GET /api/v1/admin/plans - List all plans (active & inactive) with subscription counts
  fastify.get('/plans', async (request, reply) => {
    const plans = await prisma.subscriptionPlan.findMany({
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
      orderBy: { priceMonthly: 'asc' },
    });
    return reply.send({ success: true, data: plans });
  });

  // POST /api/v1/admin/plans - Create a new subscription plan
  fastify.post('/plans', async (request, reply) => {
    const { name, priceMonthly, maxBranches, maxServices, maxDailyQueueLimit, features, isActive } = request.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return reply.code(400).send({ success: false, error: 'Plan name is required.' });
    }

    let parsedFeatures = [];
    if (Array.isArray(features)) {
      parsedFeatures = features.map(f => String(f).trim()).filter(Boolean);
    } else if (typeof features === 'string') {
      parsedFeatures = features.split(',').map(f => f.trim()).filter(Boolean);
    }

    const newPlan = await prisma.subscriptionPlan.create({
      data: {
        name: name.trim(),
        priceMonthly: typeof priceMonthly === 'number' ? priceMonthly : parseFloat(priceMonthly) || 0,
        maxBranches: parseInt(maxBranches, 10) || 1,
        maxServices: parseInt(maxServices, 10) || 3,
        maxDailyQueueLimit: parseInt(maxDailyQueueLimit, 10) || 50,
        features: parsedFeatures,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'PLAN_CREATED',
        entityType: 'SUBSCRIPTION_PLAN',
        entityId: newPlan.id,
        details: `Created subscription plan "${newPlan.name}" at ₹${newPlan.priceMonthly}/mo.`,
      },
    });

    return reply.code(201).send({ success: true, data: newPlan });
  });

  // PATCH /api/v1/admin/plans/:planId - Update an existing plan
  fastify.patch('/plans/:planId', async (request, reply) => {
    const { planId } = request.params;
    const { name, priceMonthly, maxBranches, maxServices, maxDailyQueueLimit, features, isActive } = request.body || {};

    const existing = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!existing) {
      return reply.code(404).send({ success: false, error: 'Subscription plan not found.' });
    }

    const updateData = {};
    if (name !== undefined && typeof name === 'string' && name.trim()) updateData.name = name.trim();
    if (priceMonthly !== undefined) updateData.priceMonthly = parseFloat(priceMonthly) || 0;
    if (maxBranches !== undefined) updateData.maxBranches = parseInt(maxBranches, 10) || 1;
    if (maxServices !== undefined) updateData.maxServices = parseInt(maxServices, 10) || 1;
    if (maxDailyQueueLimit !== undefined) updateData.maxDailyQueueLimit = parseInt(maxDailyQueueLimit, 10) || 1;
    if (features !== undefined) {
      updateData.features = Array.isArray(features)
        ? features.map(f => String(f).trim()).filter(Boolean)
        : typeof features === 'string' ? features.split(',').map(f => f.trim()).filter(Boolean) : [];
    }
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.subscriptionPlan.update({
      where: { id: planId },
      data: updateData,
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'PLAN_UPDATED',
        entityType: 'SUBSCRIPTION_PLAN',
        entityId: planId,
        details: `Updated subscription plan "${updated.name}".`,
      },
    });

    return reply.send({ success: true, data: updated });
  });

  // DELETE /api/v1/admin/plans/:planId - Delete or deactivate plan
  fastify.delete('/plans/:planId', async (request, reply) => {
    const { planId } = request.params;

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: { _count: { select: { subscriptions: true } } },
    });

    if (!plan) {
      return reply.code(404).send({ success: false, error: 'Subscription plan not found.' });
    }

    if (plan._count.subscriptions > 0) {
      const deactivated = await prisma.subscriptionPlan.update({
        where: { id: planId },
        data: { isActive: false },
        include: { _count: { select: { subscriptions: true } } },
      });

      await prisma.auditLog.create({
        data: {
          userId: request.user.id,
          action: 'PLAN_DEACTIVATED',
          entityType: 'SUBSCRIPTION_PLAN',
          entityId: planId,
          details: `Plan "${plan.name}" has ${plan._count.subscriptions} active subscriber(s). It was deactivated instead of deleted.`,
        },
      });

      return reply.send({
        success: true,
        deactivated: true,
        message: `Plan has ${plan._count.subscriptions} active subscription(s); it was deactivated rather than deleted.`,
        data: deactivated,
      });
    }

    await prisma.subscriptionPlan.delete({ where: { id: planId } });

    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action: 'PLAN_DELETED',
        entityType: 'SUBSCRIPTION_PLAN',
        entityId: planId,
        details: `Admin deleted subscription plan "${plan.name}".`,
      },
    });

    return reply.send({ success: true, message: 'Plan deleted successfully.' });
  });

  // --- SUBSCRIBED BUSINESS USER MANAGEMENT ---

  // GET /api/v1/admin/subscriptions - List all subscriptions with owner & business details
  fastify.get('/subscriptions', async (request, reply) => {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        business: {
          include: {
            members: {
              where: { isOwner: true },
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    fullName: true,
                    phone: true,
                    isActive: true,
                  },
                },
              },
            },
            _count: {
              select: { branches: true },
            },
          },
        },
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ success: true, data: subscriptions });
  });

  // PATCH /api/v1/admin/subscriptions/:subscriptionId - Update status, plan, or extend subscription
  fastify.patch('/subscriptions/:subscriptionId', async (request, reply) => {
    const { subscriptionId } = request.params;
    const { planId, status, endDate, extendDays } = request.body || {};

    const existing = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { business: true, plan: true },
    });

    if (!existing) {
      return reply.code(404).send({ success: false, error: 'Subscription record not found.' });
    }

    const validStatuses = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'EXPIRED', 'CANCELLED'];
    if (status && !validStatuses.includes(status)) {
      return reply.code(400).send({ success: false, error: `Invalid subscription status: ${status}` });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (planId) {
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) {
        return reply.code(404).send({ success: false, error: 'Plan not found.' });
      }
      updateData.planId = planId;
    }

    if (endDate) {
      updateData.endDate = new Date(endDate);
    } else if (extendDays && typeof extendDays === 'number') {
      const currentEnd = existing.endDate && new Date(existing.endDate) > new Date()
        ? new Date(existing.endDate)
        : new Date();
      updateData.endDate = new Date(currentEnd.getTime() + extendDays * 24 * 60 * 60 * 1000);
    }

    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: updateData,
      include: {
        business: {
          include: {
            members: {
              where: { isOwner: true },
              include: {
                user: { select: { id: true, email: true, fullName: true, phone: true } },
              },
            },
            _count: {
              select: { branches: true },
            },
          },
        },
        plan: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        businessId: existing.businessId,
        action: 'SUBSCRIPTION_UPDATED',
        entityType: 'SUBSCRIPTION',
        entityId: subscriptionId,
        details: `Admin updated subscription for "${existing.business.name}" (Status: ${updated.status}, Plan: ${updated.plan.name}).`,
      },
    });

    return reply.send({ success: true, data: updated });
  });

  // POST /api/v1/admin/subscriptions/assign - Assign or initialize subscription for a business
  fastify.post('/subscriptions/assign', async (request, reply) => {
    const { businessId, planId, status = 'ACTIVE', durationDays = 30 } = request.body || {};

    if (!businessId || !planId) {
      return reply.code(400).send({ success: false, error: 'Business ID and Plan ID are required.' });
    }

    const [business, plan] = await Promise.all([
      prisma.business.findUnique({ where: { id: businessId } }),
      prisma.subscriptionPlan.findUnique({ where: { id: planId } }),
    ]);

    if (!business) return reply.code(404).send({ success: false, error: 'Business not found.' });
    if (!plan) return reply.code(404).send({ success: false, error: 'Subscription plan not found.' });

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + Number(durationDays) * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.upsert({
      where: { businessId },
      update: {
        planId,
        status,
        startDate,
        endDate,
      },
      create: {
        businessId,
        planId,
        status,
        startDate,
        endDate,
      },
      include: {
        business: {
          include: {
            members: {
              where: { isOwner: true },
              include: {
                user: { select: { id: true, email: true, fullName: true, phone: true } },
              },
            },
            _count: {
              select: { branches: true },
            },
          },
        },
        plan: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        businessId,
        action: 'SUBSCRIPTION_ASSIGNED',
        entityType: 'SUBSCRIPTION',
        entityId: subscription.id,
        details: `Assigned plan "${plan.name}" (${status}) to business "${business.name}" for ${durationDays} days.`,
      },
    });

    return reply.send({ success: true, data: subscription });
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
