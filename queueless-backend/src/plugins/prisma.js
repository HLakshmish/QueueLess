import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

async function prismaPlugin(fastify, options) {
  const prisma = new PrismaClient({
    log: fastify.log.level === 'debug' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

  await prisma.$connect();

  fastify.decorate('prisma', prisma);

  // Auto-seed if database is currently empty
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      const { seedDatabase } = await import('../../prisma/seed.js');
      fastify.log.info('🌱 Empty database detected! Auto-seeding initial users and demo business...');
      await seedDatabase(prisma);
      fastify.log.info('✅ Auto-seed completed successfully!');
    }
  } catch (err) {
    fastify.log.error(err, 'Failed checking or auto-seeding database');
  }

  fastify.addHook('onClose', async (server) => {
    server.log.info('Disconnecting Prisma Client...');
    await server.prisma.$disconnect();
  });
}

export default fp(prismaPlugin);
