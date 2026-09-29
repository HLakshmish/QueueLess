import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seedDatabase(dbClient = prisma) {
  const prisma = dbClient;
  console.log('🌱 Starting QueueLess Database Seed...');

  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 10);
  const businessPassword = await bcrypt.hash('business123', 10);
  const customerPassword = await bcrypt.hash('customer123', 10);

  // 1. Subscription Plans
  console.log('Seeding Subscription Plans...');
  const trialPlan = await prisma.subscriptionPlan.upsert({
    where: { id: 'plan-trial-001' },
    update: {},
    create: {
      id: 'plan-trial-001',
      name: 'Trial',
      priceMonthly: 0,
      maxBranches: 1,
      maxServices: 2,
      maxDailyQueueLimit: 30,
      features: ['Basic Queues', 'Single Branch', 'Email Notifications', 'Community Support'],
    },
  });

  const basicPlan = await prisma.subscriptionPlan.upsert({
    where: { id: 'plan-basic-002' },
    update: {},
    create: {
      id: 'plan-basic-002',
      name: 'Basic',
      priceMonthly: 999,
      maxBranches: 1,
      maxServices: 5,
      maxDailyQueueLimit: 150,
      features: ['Live Queue Tracking', 'SMS Notifications', 'Basic Analytics', 'Standard Support'],
    },
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { id: 'plan-pro-003' },
    update: {},
    create: {
      id: 'plan-pro-003',
      name: 'Professional',
      priceMonthly: 2499,
      maxBranches: 3,
      maxServices: 15,
      maxDailyQueueLimit: 500,
      features: ['Multi-Branch Support', 'Custom Branding', 'Advanced Analytics', 'Priority Support', 'FCM Push Notifications'],
    },
  });

  const enterprisePlan = await prisma.subscriptionPlan.upsert({
    where: { id: 'plan-ent-004' },
    update: {},
    create: {
      id: 'plan-ent-004',
      name: 'Enterprise',
      priceMonthly: 5999,
      maxBranches: 20,
      maxServices: 50,
      maxDailyQueueLimit: 5000,
      features: ['Unlimited Branches', 'Dedicated SLA', 'Full Customization', 'API Access', '24/7 Phone Support'],
    },
  });

  // 2. Application Manager
  console.log('Seeding Application Manager...');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@queueless.com' },
    update: {},
    create: {
      email: 'admin@queueless.com',
      passwordHash: adminPassword,
      fullName: 'System Administrator',
      phone: '+91 9876543210',
      role: 'APPLICATION_MANAGER',
      isActive: true,
    },
  });

  // 3. Business User
  console.log('Seeding Business User & Business...');
  const businessUser = await prisma.user.upsert({
    where: { email: 'dr.sharma@apexclinic.com' },
    update: {},
    create: {
      email: 'dr.sharma@apexclinic.com',
      passwordHash: businessPassword,
      fullName: 'Dr. Rajesh Sharma',
      phone: '+91 9887766554',
      role: 'BUSINESS_USER',
      isActive: true,
    },
  });

  // 4. Business Entity
  let business = await prisma.business.findFirst({
    where: { name: 'Apex Health & Wellness Clinic' },
  });

  if (!business) {
    business = await prisma.business.create({
      data: {
        name: 'Apex Health & Wellness Clinic',
        description: 'Premier outpatient clinic providing family medicine, pediatrics, and preventive care.',
        category: 'Healthcare & Clinic',
        status: 'ACTIVE',
        phone: '+91 80 2345 6789',
        email: 'contact@apexclinic.com',
        members: {
          create: {
            userId: businessUser.id,
            isOwner: true,
            permissions: ['QUEUE_MANAGE', 'SERVICE_MANAGE', 'ANALYTICS_VIEW', 'SUBSCRIPTION_MANAGE'],
          },
        },
        subscription: {
          create: {
            planId: proPlan.id,
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        },
      },
    });
  }

  // 5. Branches
  console.log('Seeding Branches & Services...');
  let branch1 = await prisma.branch.findFirst({
    where: { businessId: business.id, name: 'Indiranagar Branch' },
  });

  if (!branch1) {
    branch1 = await prisma.branch.create({
      data: {
        businessId: business.id,
        name: 'Indiranagar Branch',
        address: '100 Feet Road, 12th Main, HAL 2nd Stage',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560038',
        phone: '+91 80 2345 6781',
        businessHours: {
          createMany: {
            data: [
              { dayOfWeek: 1, openTime: '08:30', closeTime: '19:30', isOpen: true },
              { dayOfWeek: 2, openTime: '08:30', closeTime: '19:30', isOpen: true },
              { dayOfWeek: 3, openTime: '08:30', closeTime: '19:30', isOpen: true },
              { dayOfWeek: 4, openTime: '08:30', closeTime: '19:30', isOpen: true },
              { dayOfWeek: 5, openTime: '08:30', closeTime: '19:30', isOpen: true },
              { dayOfWeek: 6, openTime: '09:00', closeTime: '17:00', isOpen: true },
              { dayOfWeek: 0, openTime: '10:00', closeTime: '14:00', isOpen: false },
            ],
          },
        },
      },
    });
  }

  // 6. Services & Live Queues
  let serviceGeneral = await prisma.service.findFirst({
    where: { branchId: branch1.id, name: 'General Physician Consultation' },
  });

  if (!serviceGeneral) {
    serviceGeneral = await prisma.service.create({
      data: {
        branchId: branch1.id,
        name: 'General Physician Consultation',
        description: 'Consultation for common ailments, fever, general health checkups',
        avgDurationMinutes: 12,
        isActive: true,
      },
    });
  }

  let queueGeneral = await prisma.queue.findFirst({
    where: { serviceId: serviceGeneral.id },
  });

  if (!queueGeneral) {
    queueGeneral = await prisma.queue.create({
      data: {
        serviceId: serviceGeneral.id,
        title: "Today's General Outpatient Queue",
        status: 'OPEN',
        currentNumber: 1,
        maxCapacity: 100,
      },
    });
  }

  // 7. Customers
  console.log('Seeding Customers and Queue Entries...');
  const customer1 = await prisma.user.upsert({
    where: { email: 'rahul.verma@example.com' },
    update: {},
    create: {
      email: 'rahul.verma@example.com',
      passwordHash: customerPassword,
      fullName: 'Rahul Verma',
      phone: '+91 9900112233',
      role: 'CUSTOMER',
      isActive: true,
    },
  });

  const customer2 = await prisma.user.upsert({
    where: { email: 'priya.nair@example.com' },
    update: {},
    create: {
      email: 'priya.nair@example.com',
      passwordHash: customerPassword,
      fullName: 'Priya Nair',
      phone: '+91 9911223344',
      role: 'CUSTOMER',
      isActive: true,
    },
  });

  // Queue Entries
  const existingEntriesCount = await prisma.queueEntry.count({
    where: { queueId: queueGeneral.id },
  });

  if (existingEntriesCount === 0) {
    // Entry 1: Currently SERVING
    await prisma.queueEntry.create({
      data: {
        queueId: queueGeneral.id,
        userId: customer1.id,
        customerName: customer1.fullName,
        customerPhone: customer1.phone,
        queueNumber: 1,
        status: 'SERVING',
        estimatedWaitMinutes: 0,
        calledAt: new Date(Date.now() - 5 * 60 * 1000),
        checkedInAt: new Date(Date.now() - 8 * 60 * 1000),
      },
    });

    // Entry 2: WAITING (Priya)
    await prisma.queueEntry.create({
      data: {
        queueId: queueGeneral.id,
        userId: customer2.id,
        customerName: customer2.fullName,
        customerPhone: customer2.phone,
        queueNumber: 2,
        status: 'WAITING',
        estimatedWaitMinutes: 12,
      },
    });

    // Entry 3: WAITING (Walk-in customer)
    await prisma.queueEntry.create({
      data: {
        queueId: queueGeneral.id,
        userId: null,
        customerName: 'Anil Kumar (Walk-in)',
        customerPhone: '+91 9844112233',
        queueNumber: 3,
        status: 'WAITING',
        estimatedWaitMinutes: 24,
        notes: 'Walk-in added by reception desk',
      },
    });
  }

  // 8. Audit Log
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SYSTEM_INITIALIZED',
      entityType: 'PLATFORM',
      details: 'Initial platform seed successfully applied with default subscription plans and demo business.',
    },
  });

  console.log('✅ QueueLess Database seeded successfully!');
  console.log('----------------------------------------------------');
  console.log('Application Manager: admin@queueless.com / admin123');
  console.log('Business User:       dr.sharma@apexclinic.com / business123');
  console.log('Customer:            rahul.verma@example.com / customer123');
  console.log('----------------------------------------------------');
}

if (process.argv[1]?.includes('seed.js')) {
  seedDatabase()
    .catch((e) => {
      console.error('❌ Error during seeding:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
