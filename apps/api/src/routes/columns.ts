import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireBoardMember } from '../middleware/board';
import { Role } from '@prisma/client';

export async function columnRoutes(app: FastifyInstance) {
  // GET /api/boards/:boardId/columns
  app.get('/:boardId/columns', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const { boardId } = request.params as { boardId: string };
    const columns = await prisma.column.findMany({
      where: { boardId },
      orderBy: { order: 'asc' },
      include: {
        tasks: {
          orderBy: { order: 'asc' },
          include: {
            assignees: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
            subtasks: true,
            _count: { select: { comments: true } },
          },
        },
      },
    });
    return reply.send({ success: true, data: columns });
  });

  // POST /api/boards/:boardId/columns
  app.post('/:boardId/columns', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { role: Role };
    const { boardId } = request.params as { boardId: string };
    if (user.role !== Role.PM) return reply.code(403).send({ success: false, error: 'Only PMs can manage columns' });

    const { name } = request.body as { name: string };
    if (!name) return reply.code(400).send({ success: false, error: 'name is required' });

    const maxOrder = await prisma.column.aggregate({ where: { boardId }, _max: { order: true } });
    const order = (maxOrder._max.order ?? -1) + 1;

    const column = await prisma.column.create({ data: { name, boardId, order } });
    app.io.to(boardId).emit('column:created', { boardId, data: column });
    return reply.code(201).send({ success: true, data: column });
  });

  // PATCH /api/boards/:boardId/columns/:columnId
  app.patch('/:boardId/columns/:columnId', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { role: Role };
    const { boardId, columnId } = request.params as { boardId: string; columnId: string };
    if (user.role !== Role.PM) return reply.code(403).send({ success: false, error: 'Only PMs can manage columns' });

    const { name } = request.body as { name?: string };
    const column = await prisma.column.update({ where: { id: columnId }, data: { name } });
    app.io.to(boardId).emit('column:updated', { boardId, data: column });
    return reply.send({ success: true, data: column });
  });

  // DELETE /api/boards/:boardId/columns/:columnId
  app.delete('/:boardId/columns/:columnId', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { role: Role };
    const { boardId, columnId } = request.params as { boardId: string; columnId: string };
    if (user.role !== Role.PM) return reply.code(403).send({ success: false, error: 'Only PMs can manage columns' });

    await prisma.column.delete({ where: { id: columnId } });
    app.io.to(boardId).emit('column:deleted', { boardId, data: { columnId } });
    return reply.send({ success: true, message: 'Column deleted' });
  });

  // PUT /api/boards/:boardId/columns/reorder
  app.put('/:boardId/columns/reorder', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { role: Role };
    const { boardId } = request.params as { boardId: string };
    if (user.role !== Role.PM) return reply.code(403).send({ success: false, error: 'Only PMs can reorder columns' });

    const { columns } = request.body as { columns: { id: string; order: number }[] };
    await prisma.$transaction(columns.map(({ id, order }) => prisma.column.update({ where: { id }, data: { order } })));
    app.io.to(boardId).emit('column:reordered', { boardId, data: columns });
    return reply.send({ success: true, message: 'Columns reordered' });
  });
}
