import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireBoardMember } from '../middleware/board';
import { Role } from '@prisma/client';

const createBoardSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const updateBoardSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

const boardSelect = {
  id: true, name: true, description: true, createdAt: true, updatedAt: true, ownerId: true,
  owner: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
  members: {
    include: { user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } } },
  },
};

export async function boardRoutes(app: FastifyInstance) {
  // GET /api/boards
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as { id: string; role: string };
    const boards = await prisma.board.findMany({
      where: {
        members: { some: { userId: user.id } },
      },
      select: boardSelect,
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ success: true, data: boards });
  });

  // POST /api/boards
  app.post('/', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as { id: string; role: Role };
    if (user.role !== Role.PM) return reply.code(403).send({ success: false, error: 'Only PMs can create boards' });

    const body = createBoardSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ success: false, error: body.error.flatten() });

    const board = await prisma.board.create({
      data: {
        name: body.data.name,
        description: body.data.description,
        ownerId: user.id,
        members: { create: { userId: user.id } },
      },
      select: boardSelect,
    });
    return reply.code(201).send({ success: true, data: board });
  });

  // GET /api/boards/:boardId
  app.get('/:boardId', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const { boardId } = request.params as { boardId: string };
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } } },
        },
        columns: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
              include: {
                assignees: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
                subtasks: { orderBy: { createdAt: 'asc' } },
                comments: {
                  orderBy: { createdAt: 'asc' },
                  include: { author: { select: { id: true, name: true, avatarUrl: true } } },
                },
                activityLogs: {
                  orderBy: { createdAt: 'desc' },
                  take: 20,
                  include: { user: { select: { id: true, name: true, avatarUrl: true } } },
                },
                column: { select: { id: true, name: true } },
                sprint: { select: { id: true, name: true } },
              },
            },
          },
        },
        sprints: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!board) return reply.code(404).send({ success: false, error: 'Board not found' });
    return reply.send({ success: true, data: board });
  });

  // PATCH /api/boards/:boardId
  app.patch('/:boardId', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { id: string; role: Role };
    const { boardId } = request.params as { boardId: string };

    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) return reply.code(404).send({ success: false, error: 'Board not found' });
    if (board.ownerId !== user.id) return reply.code(403).send({ success: false, error: 'Only board owner can edit' });

    const body = updateBoardSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ success: false, error: body.error.flatten() });

    const updated = await prisma.board.update({ where: { id: boardId }, data: body.data, select: boardSelect });
    return reply.send({ success: true, data: updated });
  });

  // DELETE /api/boards/:boardId
  app.delete('/:boardId', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { id: string };
    const { boardId } = request.params as { boardId: string };

    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) return reply.code(404).send({ success: false, error: 'Board not found' });
    if (board.ownerId !== user.id) return reply.code(403).send({ success: false, error: 'Only board owner can delete' });

    await prisma.board.delete({ where: { id: boardId } });
    return reply.send({ success: true, message: 'Board deleted' });
  });

  // POST /api/boards/:boardId/members
  app.post('/:boardId/members', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { id: string; role: Role };
    const { boardId } = request.params as { boardId: string };
    if (user.role !== Role.PM) return reply.code(403).send({ success: false, error: 'Only PMs can manage members' });

    const { userId } = request.body as { userId: string };
    if (!userId) return reply.code(400).send({ success: false, error: 'userId is required' });

    const existing = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });
    if (existing) return reply.code(409).send({ success: false, error: 'User already a member' });

    const member = await prisma.boardMember.create({
      data: { boardId, userId },
      include: { user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } } },
    });
    app.io.to(boardId).emit('member:added', { boardId, data: member });
    return reply.code(201).send({ success: true, data: member });
  });

  // DELETE /api/boards/:boardId/members/:userId
  app.delete('/:boardId/members/:userId', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { id: string; role: Role };
    const { boardId, userId } = request.params as { boardId: string; userId: string };
    if (user.role !== Role.PM) return reply.code(403).send({ success: false, error: 'Only PMs can manage members' });

    await prisma.boardMember.delete({ where: { boardId_userId: { boardId, userId } } });
    app.io.to(boardId).emit('member:removed', { boardId, data: { userId } });
    return reply.send({ success: true, message: 'Member removed' });
  });
}