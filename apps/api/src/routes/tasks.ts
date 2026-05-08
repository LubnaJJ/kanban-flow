import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireBoardMember } from '../middleware/board';
import { logActivity } from '../lib/activity';
import { Role, Priority } from '@prisma/client';

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  dueDate: z.string().optional(),
  storyPoints: z.number().optional(),
  labels: z.array(z.string()).default([]),
  columnId: z.string(),
  sprintId: z.string().optional(),
  assigneeIds: z.array(z.string()).default([]),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().optional().nullable(),
  storyPoints: z.number().optional().nullable(),
  labels: z.array(z.string()).optional(),
  columnId: z.string().optional(),
  sprintId: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional(),
  order: z.number().optional(),
});

const taskInclude = {
  assignees: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
  subtasks: { orderBy: { createdAt: 'asc' as const } },
  comments: {
    orderBy: { createdAt: 'asc' as const },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  },
  activityLogs: {
    orderBy: { createdAt: 'desc' as const },
    take: 20,
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  },
  column: { select: { id: true, name: true } },
  sprint: { select: { id: true, name: true } },
};

export async function taskRoutes(app: FastifyInstance) {
  // GET /api/boards/:boardId/tasks
  app.get('/:boardId/tasks', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const { boardId } = request.params as { boardId: string };
    const user = request.user as { id: string; role: Role };
    const query = request.query as { sprintId?: string; columnId?: string };

    const where: Record<string, unknown> = { boardId };
    if (query.sprintId) where.sprintId = query.sprintId;
    if (query.columnId) where.columnId = query.columnId;

    if (user.role === Role.ENGINEER) {
      where.assignees = { some: { userId: user.id } };
    }

    const tasks = await prisma.task.findMany({ where, orderBy: { order: 'asc' }, include: taskInclude });
    return reply.send({ success: true, data: tasks });
  });

  // GET /api/boards/:boardId/tasks/:taskId
  app.get('/:boardId/tasks/:taskId', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const { taskId } = request.params as { boardId: string; taskId: string };
    const task = await prisma.task.findUnique({ where: { id: taskId }, include: taskInclude });
    if (!task) return reply.code(404).send({ success: false, error: 'Task not found' });
    return reply.send({ success: true, data: task });
  });

  // PUT /api/boards/:boardId/tasks/reorder
  app.put('/:boardId/tasks/reorder', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { id: string };
    const { boardId } = request.params as { boardId: string };
    const { tasks } = request.body as { tasks: { id: string; order: number; columnId: string }[] };

    // Snapshot original columns BEFORE updating
    const originalTasks = await prisma.task.findMany({
      where: { id: { in: tasks.map(t => t.id) } },
      select: { id: true, columnId: true },
    });

    // Update all tasks in a transaction
    await prisma.$transaction(
      tasks.map(({ id, order, columnId }) =>
        prisma.task.update({ where: { id }, data: { order, columnId } })
      )
    );

    // Log activity for column changes
    for (const t of tasks) {
      const original = originalTasks.find(ot => ot.id === t.id);
      if (original && original.columnId !== t.columnId) {
        const col = await prisma.column.findUnique({
          where: { id: t.columnId },
          select: { name: true },
        });
        await prisma.activityLog.create({
          data: {
            action: `Moved to ${col?.name || 'column'}`,
            taskId: t.id,
            userId: user.id,
          },
        });
      }
    }

    // Fetch full task objects with all relations so other clients get complete data
    const updatedTasks = await prisma.task.findMany({
      where: { id: { in: tasks.map(t => t.id) } },
      include: taskInclude,
    });

    // Emit each as task:updated so all clients update with full data
    updatedTasks.forEach(task => {
      app.io.to(boardId).emit('task:updated', { boardId, data: task, actorId: user.id });
    });

    return reply.send({ success: true, message: 'Tasks reordered' });
  });

  // POST /api/boards/:boardId/tasks
  app.post('/:boardId/tasks', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { id: string; role: Role };
    const { boardId } = request.params as { boardId: string };
    if (user.role !== Role.PM) return reply.code(403).send({ success: false, error: 'Only PMs can create tasks' });

    const body = createTaskSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ success: false, error: body.error.flatten() });

    const { assigneeIds, dueDate, ...rest } = body.data;

    const maxOrder = await prisma.task.aggregate({
      where: { columnId: rest.columnId },
      _max: { order: true },
    });

    const task = await prisma.task.create({
      data: {
        ...rest,
        boardId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        order: (maxOrder._max.order ?? -1) + 1,
        assignees: assigneeIds.length > 0
          ? { create: assigneeIds.map((uid) => ({ userId: uid })) }
          : undefined,
      },
      include: taskInclude,
    });

    await logActivity(task.id, user.id, 'Task created');
    app.io.to(boardId).emit('task:created', { boardId, data: task, actorId: user.id });
    return reply.code(201).send({ success: true, data: task });
  });

  // PATCH /api/boards/:boardId/tasks/:taskId
  app.patch('/:boardId/tasks/:taskId', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { id: string; role: Role };
    const { boardId, taskId } = request.params as { boardId: string; taskId: string };

    const body = updateTaskSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ success: false, error: body.error.flatten() });

    const { assigneeIds, dueDate, ...rest } = body.data;

    const existing = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existing) return reply.code(404).send({ success: false, error: 'Task not found' });

    if (user.role === Role.ENGINEER) {
      const isAssigned = await prisma.taskAssignee.findUnique({
        where: { taskId_userId: { taskId, userId: user.id } },
      });
      if (!isAssigned) return reply.code(403).send({ success: false, error: 'You are not assigned to this task' });

      const allowedFields = ['columnId', 'order'];
      const disallowed = Object.keys(rest).filter((k) => !allowedFields.includes(k));
      if (disallowed.length > 0) {
        return reply.code(403).send({ success: false, error: 'Engineers can only update task status' });
      }
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...rest,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
        ...(assigneeIds !== undefined && {
          assignees: {
            deleteMany: {},
            create: assigneeIds.map((uid) => ({ userId: uid })),
          },
        }),
      },
      include: taskInclude,
    });

    // Log column change
    if (rest.columnId && rest.columnId !== existing.columnId) {
      const col = await prisma.column.findUnique({ where: { id: rest.columnId }, select: { name: true } });
      await logActivity(taskId, user.id, `Moved to ${col?.name}`);
    }

    // Log assignee change
    if (assigneeIds !== undefined) {
      await logActivity(taskId, user.id, 'Assignees updated');
    }

    // Log priority change
    if (rest.priority && rest.priority !== existing.priority) {
      await logActivity(taskId, user.id, `Priority changed to ${rest.priority}`);
    }

    app.io.to(boardId).emit('task:updated', { boardId, data: task, actorId: user.id });
    return reply.send({ success: true, data: task });
  });

  // DELETE /api/boards/:boardId/tasks/:taskId
  app.delete('/:boardId/tasks/:taskId', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { id: string; role: Role };
    const { boardId, taskId } = request.params as { boardId: string; taskId: string };
    if (user.role !== Role.PM) return reply.code(403).send({ success: false, error: 'Only PMs can delete tasks' });

    await prisma.task.delete({ where: { id: taskId } });
    app.io.to(boardId).emit('task:deleted', { boardId, data: { taskId }, actorId: user.id });
    return reply.send({ success: true, message: 'Task deleted' });
  });
}