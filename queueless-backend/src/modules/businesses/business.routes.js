export default async function businessRoutes(fastify, options) {
  const { prisma } = fastify;

  // GET /api/v1/businesses - Public discovery search
  fastify.get('/', async (request, reply) => {
    const { query, category, city } = request.query;

    const whereClause = {
      status: 'ACTIVE',
    };

    if (category) {
      whereClause.category = { contains: category, mode: 'insensitive' };
    }

    if (query) {
      whereClause.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    const businesses = await prisma.business.findMany({
      where: whereClause,
      include: {
        branches: {
          include: {
            services: {
              where: { isActive: true },
              include: {
                queues: {
                  where: { status: 'OPEN' },
                  include: {
                    entries: {
                      where: { status: { in: ['WAITING', 'CALLED', 'SERVING'] } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return reply.send({ success: true, data: businesses });
  });

  // GET /api/v1/businesses/:businessId - Details
  fastify.get('/:businessId', async (request, reply) => {
    const { businessId } = request.params;

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        branches: {
          include: {
            businessHours: true,
            services: {
              where: { isActive: true },
              include: {
                queues: {
                  where: { status: { in: ['OPEN', 'PAUSED'] } },
                  include: {
                    entries: {
                      where: { status: { in: ['WAITING', 'CHECKED_IN', 'CALLED', 'SERVING', 'SKIPPED'] } },
                      orderBy: { queueNumber: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!business) {
      return reply.code(404).send({ success: false, error: 'Business not found' });
    }

    return reply.send({ success: true, data: business });
  });

  // POST /api/v1/businesses - Create business (allows CUSTOMER to upgrade to BUSINESS_USER)
  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, fastify.authorizeRoles('CUSTOMER', 'BUSINESS_USER', 'APPLICATION_MANAGER')] },
    async (request, reply) => {
      const { name, description, category, phone, email, initialBranchName, address, city, planId } = request.body || {};

      if (!name || !category) {
        return reply.code(400).send({ success: false, error: 'Business name and category are required' });
      }

      // Upgrade customer to BUSINESS_USER if registering a business
      let updatedUserRole = request.user.role;
      if (request.user.role === 'CUSTOMER') {
        await prisma.user.update({
          where: { id: request.user.id },
          data: { role: 'BUSINESS_USER' },
        });
        updatedUserRole = 'BUSINESS_USER';
      }

      // Determine Plan
      let chosenPlan = null;
      if (planId) {
        chosenPlan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      }

      if (!chosenPlan) {
        chosenPlan = await prisma.subscriptionPlan.findFirst({ where: { name: 'Trial' } }) 
          || await prisma.subscriptionPlan.findFirst();
      }

      const isPaid = chosenPlan && chosenPlan.priceMonthly > 0;
      const subStatus = isPaid ? 'ACTIVE' : 'TRIAL';
      const durationDays = isPaid ? 30 : 14;

      // Default initial service name based on category
      let initialServiceName = 'General Consultation';
      if (category.toLowerCase().includes('salon') || category.toLowerCase().includes('spa')) {
        initialServiceName = 'Styling & Care Desk';
      } else if (category.toLowerCase().includes('restaurant') || category.toLowerCase().includes('food')) {
        initialServiceName = 'Dining & Order Queue';
      } else if (category.toLowerCase().includes('bank')) {
        initialServiceName = 'Teller & Accounts Desk';
      } else if (category.toLowerCase().includes('auto')) {
        initialServiceName = 'Vehicle Service Desk';
      }

      const business = await prisma.business.create({
        data: {
          name,
          description,
          category,
          phone: phone || request.user.phone,
          email: email || request.user.email,
          status: 'ACTIVE',
          members: {
            create: {
              userId: request.user.id,
              isOwner: true,
              permissions: ['QUEUE_MANAGE', 'SERVICE_MANAGE', 'ANALYTICS_VIEW', 'SUBSCRIPTION_MANAGE'],
            },
          },
          branches: {
            create: {
              name: initialBranchName || 'Main Branch',
              address: address || 'Headquarters',
              city: city || 'Bengaluru',
              services: {
                create: {
                  name: initialServiceName,
                  description: 'Primary customer service queue',
                  avgDurationMinutes: 15,
                  isActive: true,
                  queues: {
                    create: {
                      title: "Today's Live Queue",
                      status: 'OPEN',
                      currentNumber: 0,
                      maxCapacity: 100,
                    },
                  },
                },
              },
            },
          },
          subscription: chosenPlan ? {
            create: {
              planId: chosenPlan.id,
              status: subStatus,
              startDate: new Date(),
              endDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
            },
          } : undefined,
        },
        include: {
          branches: {
            include: {
              services: {
                include: {
                  queues: true,
                },
              },
            },
          },
          members: true,
          subscription: { include: { plan: true } },
        },
      });

      // Record simulated payment if paid plan
      if (isPaid) {
        await prisma.payment.create({
          data: {
            businessId: business.id,
            amount: chosenPlan.priceMonthly,
            status: 'COMPLETED',
            referenceId: `TXN-${Date.now()}`,
          },
        });
      }

      // Generate updated JWT token reflecting BUSINESS_USER role
      const newToken = fastify.jwt.sign({
        id: request.user.id,
        email: request.user.email,
        role: updatedUserRole,
      });

      return reply.code(201).send({
        success: true,
        data: business,
        token: newToken,
      });
    }
  );

  // PATCH /api/v1/businesses/:businessId - Update business
  fastify.patch(
    '/:businessId',
    { preHandler: [fastify.authenticate, fastify.requireBusinessAccess()] },
    async (request, reply) => {
      const { businessId } = request.params;
      const { name, description, category, phone, email, logoUrl } = request.body;

      const updated = await prisma.business.update({
        where: { id: businessId },
        data: {
          name,
          description,
          category,
          phone,
          email,
          logoUrl,
        },
      });

      return reply.send({ success: true, data: updated });
    }
  );

  // POST /api/v1/businesses/:businessId/branches - Create branch
  fastify.post(
    '/:businessId/branches',
    { preHandler: [fastify.authenticate, fastify.requireBusinessAccess('SERVICE_MANAGE')] },
    async (request, reply) => {
      const { businessId } = request.params;
      const { name, address, city, state, postalCode, phone } = request.body;

      if (!name || !address || !city) {
        return reply.code(400).send({ success: false, error: 'Name, address and city are required' });
      }

      const branch = await prisma.branch.create({
        data: {
          businessId,
          name,
          address,
          city,
          state,
          postalCode,
          phone,
        },
      });

      return reply.code(201).send({ success: true, data: branch });
    }
  );

  // GET /api/v1/businesses/:businessId/branches - List branches
  fastify.get('/:businessId/branches', async (request, reply) => {
    const { businessId } = request.params;
    const branches = await prisma.branch.findMany({
      where: { businessId },
      include: {
        services: true,
        businessHours: true,
      },
    });

    return reply.send({ success: true, data: branches });
  });

  // POST /api/v1/businesses/:businessId/members - Add authorized Business User
  fastify.post(
    '/:businessId/members',
    { preHandler: [fastify.authenticate, fastify.requireBusinessAccess()] },
    async (request, reply) => {
      const { businessId } = request.params;
      const { email, permissions } = request.body;

      const targetUser = await prisma.user.findUnique({ where: { email } });
      if (!targetUser) {
        return reply.code(404).send({ success: false, error: 'User with this email not found' });
      }

      const member = await prisma.businessMember.upsert({
        where: {
          userId_businessId: {
            userId: targetUser.id,
            businessId,
          },
        },
        update: {
          permissions: permissions || ['QUEUE_MANAGE', 'SERVICE_MANAGE'],
        },
        create: {
          userId: targetUser.id,
          businessId,
          permissions: permissions || ['QUEUE_MANAGE', 'SERVICE_MANAGE'],
          isOwner: false,
        },
        include: { user: true },
      });

      return reply.code(201).send({ success: true, data: member });
    }
  );

  // GET /api/v1/businesses/:businessId/members - List members
  fastify.get(
    '/:businessId/members',
    { preHandler: [fastify.authenticate, fastify.requireBusinessAccess()] },
    async (request, reply) => {
      const { businessId } = request.params;
      const members = await prisma.businessMember.findMany({
        where: { businessId },
        include: {
          user: {
            select: { id: true, email: true, fullName: true, phone: true, role: true },
          },
        },
      });

      return reply.send({ success: true, data: members });
    }
  );
}
