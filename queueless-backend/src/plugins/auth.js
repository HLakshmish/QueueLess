import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { config } from '../config/index.js';

async function authPlugin(fastify, options) {
  fastify.register(fastifyJwt, {
    secret: config.jwtSecret,
    sign: {
      expiresIn: '7d',
    },
  });

  fastify.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({
        success: false,
        error: 'Unauthorized: Invalid or expired token',
      });
    }
  });

  fastify.decorate('authorizeRoles', (...allowedRoles) => {
    return async (request, reply) => {
      if (!request.user || !allowedRoles.includes(request.user.role)) {
        return reply.code(403).send({
          success: false,
          error: `Forbidden: Requires one of [${allowedRoles.join(', ')}] role`,
        });
      }
    };
  });

  // Business Membership Verification
  fastify.decorate('requireBusinessAccess', (requiredPermission = null) => {
    return async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({ success: false, error: 'Unauthorized' });
      }

      // Application Manager has platform-wide authorization
      if (user.role === 'APPLICATION_MANAGER') {
        return;
      }

      if (user.role !== 'BUSINESS_USER') {
        return reply.code(403).send({ success: false, error: 'Requires BUSINESS_USER role' });
      }

      const businessId = request.params.businessId || request.body?.businessId || request.query?.businessId;
      if (!businessId) {
        return reply.code(400).send({ success: false, error: 'Business ID is required in request' });
      }

      const membership = await fastify.prisma.businessMember.findUnique({
        where: {
          userId_businessId: {
            userId: user.id,
            businessId: businessId,
          },
        },
        include: {
          business: {
            include: { subscription: true },
          },
        },
      });

      if (!membership) {
        return reply.code(403).send({
          success: false,
          error: 'Forbidden: You are not an authorized member of this business',
        });
      }

      // Check if subscription plan is active and not expired
      const sub = membership.business?.subscription;
      const isExpired = !sub ||
        ['EXPIRED', 'CANCELLED', 'PAST_DUE', 'SUSPENDED'].includes(sub.status) ||
        (sub.endDate && new Date(sub.endDate).getTime() <= Date.now());

      if (isExpired) {
        if (sub && sub.status !== 'EXPIRED' && sub.endDate && new Date(sub.endDate).getTime() <= Date.now()) {
          await fastify.prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'EXPIRED' },
          }).catch(() => {});
        }
        return reply.code(403).send({
          success: false,
          error: 'Your subscription plan has expired. Please renew your subscription to access business actions.',
          code: 'SUBSCRIPTION_EXPIRED',
        });
      }

      if (requiredPermission && !membership.isOwner && !membership.permissions.includes(requiredPermission)) {
        return reply.code(403).send({
          success: false,
          error: `Forbidden: Missing required permission [${requiredPermission}]`,
        });
      }

      request.businessMember = membership;
    };
  });
}

export default fp(authPlugin);
