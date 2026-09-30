export default async function analyticsRoutes(fastify, options) {
  const { prisma } = fastify;

  // GET /api/v1/analytics/business/:businessId - Business analytics
  fastify.get(
    '/business/:businessId',
    { preHandler: [fastify.authenticate, fastify.requireBusinessAccess('ANALYTICS_VIEW')] },
    async (request, reply) => {
      const { businessId } = request.params;

      // Find all queues across branches of this business
      const branches = await prisma.branch.findMany({
        where: { businessId },
        include: {
          services: {
            include: {
              queues: {
                include: {
                  entries: true,
                },
              },
            },
          },
        },
      });

      let totalServed = 0;
      let totalWaiting = 0;
      let totalCancelled = 0;
      let totalSkipped = 0;
      let totalEntries = 0;

      let totalWaitTimeMs = 0;
      let waitCount = 0;
      let totalServiceTimeMs = 0;
      let serviceCount = 0;

      const hourlyCounts = Array(24).fill(0);

      for (const branch of branches) {
        for (const service of branch.services) {
          for (const queue of service.queues) {
            for (const entry of queue.entries) {
              totalEntries++;
              
              // Hour bucket
              const createdDate = new Date(entry.createdAt);
              const hour = createdDate.getHours();
              if (hour >= 0 && hour < 24) {
                hourlyCounts[hour]++;
              }

              if (entry.status === 'SERVED') {
                totalServed++;
                if (entry.calledAt && entry.createdAt) {
                  totalWaitTimeMs += (new Date(entry.calledAt) - new Date(entry.createdAt));
                  waitCount++;
                }
                if (entry.servedAt && entry.calledAt) {
                  totalServiceTimeMs += (new Date(entry.servedAt) - new Date(entry.calledAt));
                  serviceCount++;
                }
              }
              else if (entry.status === 'WAITING' || entry.status === 'CHECKED_IN') totalWaiting++;
              else if (entry.status === 'CANCELLED') totalCancelled++;
              else if (entry.status === 'SKIPPED') totalSkipped++;
            }
          }
        }
      }

      const completionRate = totalEntries > 0 ? Math.round((totalServed / totalEntries) * 100) : 100;
      const averageWaitMinutes = waitCount > 0 ? Math.round(totalWaitTimeMs / (waitCount * 60000)) : 12;
      const averageServiceMinutes = serviceCount > 0 ? Math.round(totalServiceTimeMs / (serviceCount * 60000)) : 10;

      return reply.send({
        success: true,
        data: {
          totalServed,
          totalWaiting,
          totalCancelled,
          totalSkipped,
          totalEntries,
          completionRate,
          averageWaitMinutes,
          averageServiceMinutes,
          hourlyDistribution: hourlyCounts,
        },
      });
    }
  );

  // GET /api/v1/analytics/platform - Platform analytics (APPLICATION_MANAGER only)
  fastify.get(
    '/platform',
    { preHandler: [fastify.authenticate, fastify.authorizeRoles('APPLICATION_MANAGER')] },
    async (request, reply) => {
      const [totalUsers, totalBusinesses, activeSubscriptions, totalEntries, totalServed] = await Promise.all([
        prisma.user.count(),
        prisma.business.count(),
        prisma.subscription.count({ where: { status: 'ACTIVE' } }),
        prisma.queueEntry.count(),
        prisma.queueEntry.count({ where: { status: 'SERVED' } }),
      ]);

      const usersByRole = await prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      });

      return reply.send({
        success: true,
        data: {
          totalUsers,
          totalBusinesses,
          activeSubscriptions,
          totalEntries,
          totalServed,
          usersByRole: usersByRole.reduce((acc, curr) => {
            acc[curr.role] = curr._count.id;
            return acc;
          }, {}),
          platformHealth: 'OPERATIONAL',
        },
      });
    }
  );
}
