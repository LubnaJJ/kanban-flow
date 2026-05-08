import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['PM', 'ENGINEER']).default('ENGINEER'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/register
  app.post('/register', async (request, reply) => {
    const body = registerSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ success: false, error: body.error.flatten() });

    const { email, password, name, role } = body.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return reply.code(409).send({ success: false, error: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name, role },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true },
    });

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '7d' });
    return reply.code(201).send({ success: true, data: { token, user } });
  });

  // POST /api/auth/login
  app.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ success: false, error: body.error.flatten() });

    const { email, password } = body.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return reply.code(401).send({ success: false, error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return reply.code(401).send({ success: false, error: 'Invalid credentials' });

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role }, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user;
    return reply.send({ success: true, data: { token, user: safeUser } });
  });

  // GET /api/auth/me
  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.user as { id: string };
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true },
    });
    if (!user) return reply.code(404).send({ success: false, error: 'User not found' });
    return reply.send({ success: true, data: user });
  });

  // GET /api/auth/users - list all users (PM only, for adding members)
  app.get('/users', { preHandler: authenticate }, async (request, reply) => {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, avatarUrl: true },
      orderBy: { name: 'asc' },
    });
    return reply.send({ success: true, data: users });
  });
}
