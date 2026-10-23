import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

async function prismaPlugin(fastify, options) {
  const prisma = new PrismaClient({
    log: fastify.log.level === 'debug' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

  await prisma.$connect();

  fastify.decorate('prisma', prisma);

  // Auto-patch database schema if missing optional tables/columns
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "type" TEXT NOT NULL DEFAULT 'QUEUE_UPDATE',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "branches" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
    `);
  } catch (schemaErr) {
    fastify.log.warn('Auto-schema patch warning: ' + schemaErr.message);
  }

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
