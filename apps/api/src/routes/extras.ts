import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireBoardMember } from '../middleware/board';
import { logActivity } from '../lib/activity';
import { Role, SprintStatus } from '@prisma/client';

// ─── Subtasks ─────────────────────────────────────────────────────────────────

export async function subtaskRoutes(app: FastifyInstance) {
  app.post('/:boardId/tasks/:taskId/subtasks', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { id: string; role: Role };
    const { boardId, taskId } = request.params as { boardId: string; taskId: string };
    const { title, assigneeId } = request.body as { title: string; assigneeId?: string };
    if (!title) return reply.code(400).send({ success: false, error: 'title is required' });
    const subtask = await prisma.subtask.create({
      data: { title, taskId, assigneeId },
      include: { assignee: { select: { id: true, name: true, avatarUrl: true } } },
    });
    await logActivity(taskId, user.id, `Added subtask: ${title}`);
    app.io.to(boardId).emit('subtask:updated', { boardId, data: { taskId, subtask }, actorId: user.id });
    return reply.code(201).send({ success: true, data: subtask });
  });

  app.patch('/:boardId/tasks/:taskId/subtasks/:subtaskId', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { id: string };
    const { boardId, taskId, subtaskId } = request.params as { boardId: string; taskId: string; subtaskId: string };
    const { title, completed, assigneeId } = request.body as { title?: string; completed?: boolean; assigneeId?: string | null };
    const subtask = await prisma.subtask.update({
      where: { id: subtaskId },
      data: { title, completed, assigneeId },
      include: { assignee: { select: { id: true, name: true, avatarUrl: true } } },
    });
    if (completed !== undefined) {
      await logActivity(taskId, user.id, completed ? `Subtask completed: ${subtask.title}` : `Subtask reopened: ${subtask.title}`);
    }
    app.io.to(boardId).emit('subtask:updated', { boardId, data: { taskId, subtask }, actorId: user.id });
    return reply.send({ success: true, data: subtask });
  });

  app.delete('/:boardId/tasks/:taskId/subtasks/:subtaskId', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { id: string; role: Role };
    const { boardId, taskId, subtaskId } = request.params as { boardId: string; taskId: string; subtaskId: string };
    if (user.role !== Role.PM) return reply.code(403).send({ success: false, error: 'Only PMs can delete subtasks' });
    await prisma.subtask.delete({ where: { id: subtaskId } });
    app.io.to(boardId).emit('subtask:updated', { boardId, data: { taskId, subtaskId, deleted: true }, actorId: user.id });
    return reply.send({ success: true, message: 'Subtask deleted' });
  });
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function commentRoutes(app: FastifyInstance) {
  app.post('/:boardId/tasks/:taskId/comments', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { id: string };
    const { boardId, taskId } = request.params as { boardId: string; taskId: string };
    const { content } = request.body as { content: string };
    if (!content?.trim()) return reply.code(400).send({ success: false, error: 'content is required' });
    const comment = await prisma.comment.create({
      data: { content, taskId, authorId: user.id },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
    await logActivity(taskId, user.id, 'Added a comment');
    app.io.to(boardId).emit('comment:created', { boardId, data: { taskId, comment }, actorId: user.id });
    return reply.code(201).send({ success: true, data: comment });
  });

  app.patch('/:boardId/tasks/:taskId/comments/:commentId', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { id: string };
    const { boardId, taskId, commentId } = request.params as { boardId: string; taskId: string; commentId: string };
    const { content } = request.body as { content: string };
    const existing = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!existing) return reply.code(404).send({ success: false, error: 'Comment not found' });
    if (existing.authorId !== user.id) return reply.code(403).send({ success: false, error: 'Cannot edit others comments' });
    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { content },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
    app.io.to(boardId).emit('comment:updated', { boardId, data: { taskId, comment }, actorId: user.id });
    return reply.send({ success: true, data: comment });
  });

  app.delete('/:boardId/tasks/:taskId/comments/:commentId', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { id: string; role: Role };
    const { boardId, taskId, commentId } = request.params as { boardId: string; taskId: string; commentId: string };
    const existing = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!existing) return reply.code(404).send({ success: false, error: 'Comment not found' });
    if (existing.authorId !== user.id && user.role !== Role.PM) {
      return reply.code(403).send({ success: false, error: 'Cannot delete others comments' });
    }
    await prisma.comment.delete({ where: { id: commentId } });
    app.io.to(boardId).emit('comment:deleted', { boardId, data: { taskId, commentId }, actorId: user.id });
    return reply.send({ success: true, message: 'Comment deleted' });
  });
}

// ─── Sprints ──────────────────────────────────────────────────────────────────

export async function sprintRoutes(app: FastifyInstance) {
  app.get('/:boardId/sprints', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const { boardId } = request.params as { boardId: string };
    const sprints = await prisma.sprint.findMany({
      where: { boardId },
      orderBy: { createdAt: 'desc' },
      include: {
        tasks: {
          include: {
            assignees: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
            subtasks: true,
            column: { select: { id: true, name: true } },
          },
        },
      },
    });
    return reply.send({ success: true, data: sprints });
  });

  app.post('/:boardId/sprints', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { role: Role };
    const { boardId } = request.params as { boardId: string };
    if (user.role !== Role.PM) return reply.code(403).send({ success: false, error: 'Only PMs can manage sprints' });
    const { name, startDate, endDate } = request.body as { name: string; startDate?: string; endDate?: string };
    if (!name) return reply.code(400).send({ success: false, error: 'name is required' });
    const sprint = await prisma.sprint.create({
      data: { name, boardId, startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined },
    });
    app.io.to(boardId).emit('sprint:created', { boardId, data: sprint });
    return reply.code(201).send({ success: true, data: sprint });
  });

  app.patch('/:boardId/sprints/:sprintId', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { role: Role };
    const { boardId, sprintId } = request.params as { boardId: string; sprintId: string };
    if (user.role !== Role.PM) return reply.code(403).send({ success: false, error: 'Only PMs can manage sprints' });
    const { name, status, startDate, endDate } = request.body as { name?: string; status?: SprintStatus; startDate?: string; endDate?: string };
    const sprint = await prisma.sprint.update({
      where: { id: sprintId },
      data: { name, status, startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined },
    });
    app.io.to(boardId).emit('sprint:updated', { boardId, data: sprint });
    return reply.send({ success: true, data: sprint });
  });

  app.delete('/:boardId/sprints/:sprintId', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { role: Role };
    const { boardId, sprintId } = request.params as { boardId: string; sprintId: string };
    if (user.role !== Role.PM) return reply.code(403).send({ success: false, error: 'Only PMs can manage sprints' });
    await prisma.task.updateMany({ where: { sprintId }, data: { sprintId: null } });
    await prisma.sprint.delete({ where: { id: sprintId } });
    return reply.send({ success: true, message: 'Sprint deleted' });
  });
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

export async function meetingRoutes(app: FastifyInstance) {
  app.get('/:boardId/meetings', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const { boardId } = request.params as { boardId: string };
    const meetings = await prisma.meeting.findMany({
      where: { boardId },
      orderBy: { scheduledAt: 'asc' },
      include: {
        organizer: { select: { id: true, name: true, avatarUrl: true } },
        participants: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        sprint: { select: { id: true, name: true } },
      },
    });
    return reply.send({ success: true, data: meetings });
  });

  app.post('/:boardId/meetings', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { id: string; role: Role };
    const { boardId } = request.params as { boardId: string };
    if (user.role !== Role.PM) return reply.code(403).send({ success: false, error: 'Only PMs can schedule meetings' });
    const { title, description, scheduledAt, sprintId, participantIds = [], meetingUrl } = request.body as {
      title: string; description?: string; scheduledAt: string; sprintId?: string; participantIds?: string[]; meetingUrl?: string;
    };
    if (!title || !scheduledAt) return reply.code(400).send({ success: false, error: 'title and scheduledAt are required' });
    const meeting = await prisma.meeting.create({
      data: {
        title, description, boardId,
        scheduledAt: new Date(scheduledAt),
        sprintId: sprintId || null,
        organizerId: user.id,
        meetingUrl: meetingUrl || null,
        participants: {
          create: [...new Set([user.id, ...participantIds])].map((uid) => ({ userId: uid })),
        },
      },
      include: {
        organizer: { select: { id: true, name: true, avatarUrl: true } },
        participants: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        sprint: { select: { id: true, name: true } },
      },
    });
    app.io.to(boardId).emit('meeting:created', { boardId, data: meeting });
    return reply.code(201).send({ success: true, data: meeting });
  });

  app.patch('/:boardId/meetings/:meetingId', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { id: string; role: Role };
    const { boardId, meetingId } = request.params as { boardId: string; meetingId: string };
    if (user.role !== Role.PM) return reply.code(403).send({ success: false, error: 'Only PMs can edit meetings' });
    const { title, description, scheduledAt, sprintId, participantIds, meetingUrl } = request.body as {
      title?: string; description?: string; scheduledAt?: string; sprintId?: string; participantIds?: string[]; meetingUrl?: string;
    };
    const meeting = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        title, description,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        sprintId: sprintId || undefined,
        meetingUrl: meetingUrl !== undefined ? (meetingUrl || null) : undefined,
        ...(participantIds !== undefined && {
          participants: {
            deleteMany: {},
            create: participantIds.map((uid) => ({ userId: uid })),
          },
        }),
      },
      include: {
        organizer: { select: { id: true, name: true, avatarUrl: true } },
        participants: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        sprint: { select: { id: true, name: true } },
      },
    });
    app.io.to(boardId).emit('meeting:updated', { boardId, data: meeting });
    return reply.send({ success: true, data: meeting });
  });

  app.delete('/:boardId/meetings/:meetingId', { preHandler: [authenticate, requireBoardMember] }, async (request, reply) => {
    const user = request.user as { role: Role };
    const { meetingId } = request.params as { boardId: string; meetingId: string };
    if (user.role !== Role.PM) return reply.code(403).send({ success: false, error: 'Only PMs can delete meetings' });
    await prisma.meeting.delete({ where: { id: meetingId } });
    return reply.send({ success: true, message: 'Meeting deleted' });
  });
}