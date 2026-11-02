export default async function subscriptionRoutes(fastify, options) {
  const { prisma } = fastify;

  // GET /api/v1/subscriptions/plans - List all subscription plans
  fastify.get('/plans', async (request, reply) => {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });
    return reply.send({ success: true, data: plans });
  });

  // POST /api/v1/subscriptions/subscribe - Subscribe business to plan
  fastify.post(
    '/subscribe',
    { preHandler: [fastify.authenticate, fastify.authorizeRoles('BUSINESS_USER', 'APPLICATION_MANAGER')] },
    async (request, reply) => {
      const { businessId, planId } = request.body;

      if (!businessId || !planId) {
        return reply.code(400).send({ success: false, error: 'Business ID and Plan ID are required' });
      }

      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) {
        return reply.code(404).send({ success: false, error: 'Plan not found' });
      }

      // Upsert subscription
      const subscription = await prisma.subscription.upsert({
        where: { businessId },
        update: {
          planId,
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
        create: {
          businessId,
          planId,
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        include: { plan: true },
      });

      // Record simulated payment
      if (plan.priceMonthly > 0) {
        await prisma.payment.create({
          data: {
            businessId,
            amount: plan.priceMonthly,
            status: 'COMPLETED',
            referenceId: `TXN-${Date.now()}`,
          },
        });
      }

      return reply.send({ success: true, data: subscription });
    }
  );

  // POST /api/v1/subscriptions/expire-current - Simulate plan expiry (for testing & verification)
  fastify.post(
    '/expire-current',
    { preHandler: [fastify.authenticate, fastify.authorizeRoles('BUSINESS_USER', 'APPLICATION_MANAGER')] },
    async (request, reply) => {
      const { businessId } = request.body;
      if (!businessId) {
        return reply.code(400).send({ success: false, error: 'Business ID is required' });
      }

      const existing = await prisma.subscription.findUnique({ where: { businessId } });
      if (!existing) {
        return reply.code(404).send({ success: false, error: 'No subscription found for business' });
      }

      const expiredSub = await prisma.subscription.update({
        where: { businessId },
        data: {
          status: 'EXPIRED',
          endDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
        },
        include: { plan: true },
      });

      return reply.send({
        success: true,
        data: expiredSub,
        message: 'Plan has expired! Business actions are now locked until a new subscription is purchased.',
      });
    }
  );
}
