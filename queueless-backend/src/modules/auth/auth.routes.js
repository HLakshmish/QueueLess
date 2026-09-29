import bcrypt from 'bcryptjs';

export default async function authRoutes(fastify, options) {
  const { prisma } = fastify;

  // POST /api/v1/auth/register
  fastify.post('/register', async (request, reply) => {
    const { email, password, fullName, phone, role } = request.body;

    if (!email || !password || !fullName) {
      return reply.code(400).send({ success: false, error: 'Email, password, and full name are required' });
    }

    // Default to CUSTOMER if not provided or invalid
    let assignedRole = 'CUSTOMER';
    if (role === 'BUSINESS_USER') {
      assignedRole = 'BUSINESS_USER';
    } else if (role === 'APPLICATION_MANAGER') {
      // Check if this is the first user or restrict in production
      assignedRole = 'APPLICATION_MANAGER';
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(400).send({ success: false, error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone,
        role: assignedRole,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return reply.code(201).send({
      success: true,
      data: {
        user,
        token,
      },
    });
  });

  // POST /api/v1/auth/login
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.code(400).send({ success: false, error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            business: {
              include: {
                subscription: {
                  include: { plan: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return reply.code(401).send({ success: false, error: 'Invalid credentials or inactive account' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return reply.code(401).send({ success: false, error: 'Invalid credentials' });
    }

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const { passwordHash, ...userData } = user;

    return reply.send({
      success: true,
      data: {
        user: userData,
        token,
      },
    });
  });

  // GET /api/v1/auth/me
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        memberships: {
          include: {
            business: {
              include: {
                subscription: {
                  include: { plan: true },
                },
              },
            },
          },
        },
      },
    });

    return reply.send({ success: true, data: user });
  });
}
