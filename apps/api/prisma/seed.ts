/// <reference types="node" />
import { PrismaClient, Role, Priority, SprintStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean up
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.taskAssignee.deleteMany();
  await prisma.task.deleteMany();
  await prisma.column.deleteMany();
  await prisma.meetingParticipant.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.boardMember.deleteMany();
  await prisma.board.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);
  const lubnaPassword = await bcrypt.hash('123456', 10);

  // ─── Users ──────────────────────────────────────────────────────────────────
  const pm = await prisma.user.create({
    data: {
      email: 'lubna@outerspace.dev',
      password: lubnaPassword,
      name: 'Lubna Jiffry',
      role: Role.PM,
    },
  });

  const atheek = await prisma.user.create({
    data: {
      email: 'atheek@outerspace.dev',
      password: hashedPassword,
      name: 'Atheek',
      role: Role.ENGINEER,
    },
  });

  const sarah = await prisma.user.create({
    data: {
      email: 'sarah@outerspace.dev',
      password: hashedPassword,
      name: 'Sarah',
      role: Role.ENGINEER,
    },
  });

  const ahmad = await prisma.user.create({
    data: {
      email: 'ahmad@outerspace.dev',
      password: hashedPassword,
      name: 'Ahmad',
      role: Role.ENGINEER,
    },
  });

  // ─── Board ──────────────────────────────────────────────────────────────────
  const board = await prisma.board.create({
    data: {
      name: 'OuterSpace Digital',
      description: 'Main product board for OuterSpace Digital',
      ownerId: pm.id,
    },
  });

  await prisma.boardMember.createMany({
    data: [
      { boardId: board.id, userId: pm.id },
      { boardId: board.id, userId: atheek.id },
      { boardId: board.id, userId: sarah.id },
      { boardId: board.id, userId: ahmad.id },
    ],
  });

  // ─── Columns ────────────────────────────────────────────────────────────────
  const columns = await Promise.all([
    prisma.column.create({ data: { name: 'Backlog', order: 0, boardId: board.id } }),
    prisma.column.create({ data: { name: 'Sprint Ready', order: 1, boardId: board.id } }),
    prisma.column.create({ data: { name: 'In Progress', order: 2, boardId: board.id } }),
    prisma.column.create({ data: { name: 'Review', order: 3, boardId: board.id } }),
    prisma.column.create({ data: { name: 'QA', order: 4, boardId: board.id } }),
    prisma.column.create({ data: { name: 'Done', order: 5, boardId: board.id } }),
  ]);

  const [backlog, sprintReady, inProgress, review, qa, done] = columns;

  // ─── Sprint ─────────────────────────────────────────────────────────────────
  const sprint = await prisma.sprint.create({
    data: {
      name: 'Sprint 1',
      boardId: board.id,
      status: SprintStatus.ACTIVE,
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  // ─── ATHEEK'S TASKS ─────────────────────────────────────────────────────────

  // Task 1 - Atheek only
  const t1 = await prisma.task.create({
    data: {
      title: 'Set up REST API with Fastify',
      description: 'Scaffold the backend API using Fastify and TypeScript. Configure routes, plugins, and error handling.',
      priority: Priority.HIGH,
      labels: ['backend', 'api'],
      storyPoints: 5,
      columnId: inProgress.id,
      boardId: board.id,
      sprintId: sprint.id,
      order: 0,
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.taskAssignee.create({ data: { taskId: t1.id, userId: atheek.id } });
  await prisma.subtask.createMany({
    data: [
      { title: 'Install and configure Fastify', completed: true, taskId: t1.id },
      { title: 'Set up route structure', completed: true, taskId: t1.id },
      { title: 'Add global error handler', completed: false, taskId: t1.id },
      { title: 'Write API documentation', completed: false, taskId: t1.id },
    ],
  });
  await prisma.comment.create({ data: { content: 'Route structure is looking clean, error handler next.', taskId: t1.id, authorId: atheek.id } });
  await prisma.comment.create({ data: { content: 'Good progress! Make sure to document each endpoint as you go.', taskId: t1.id, authorId: pm.id } });
  await prisma.activityLog.createMany({ data: [
    { action: 'Task created', taskId: t1.id, userId: pm.id },
    { action: 'Assigned to Atheek', taskId: t1.id, userId: pm.id },
    { action: 'Moved to In Progress', taskId: t1.id, userId: atheek.id },
  ]});

  // Task 2 - Atheek only
  const t2 = await prisma.task.create({
    data: {
      title: 'Implement JWT authentication',
      description: 'Build login, register and logout endpoints. Use bcrypt for password hashing and JWT for session tokens.',
      priority: Priority.HIGH,
      labels: ['backend', 'auth'],
      storyPoints: 4,
      columnId: sprintReady.id,
      boardId: board.id,
      sprintId: sprint.id,
      order: 0,
      dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.taskAssignee.create({ data: { taskId: t2.id, userId: atheek.id } });
  await prisma.subtask.createMany({ data: [
    { title: 'Create auth routes', completed: false, taskId: t2.id },
    { title: 'Add bcrypt password hashing', completed: false, taskId: t2.id },
    { title: 'Generate and verify JWT tokens', completed: false, taskId: t2.id },
  ]});
  await prisma.activityLog.createMany({ data: [
    { action: 'Task created', taskId: t2.id, userId: pm.id },
    { action: 'Assigned to Atheek', taskId: t2.id, userId: pm.id },
  ]});

  // Task 3 - Atheek only
  const t3 = await prisma.task.create({
    data: {
      title: 'Database schema and migrations',
      description: 'Design and implement the full Prisma schema. Set up all models, relations, and run initial migrations.',
      priority: Priority.CRITICAL,
      labels: ['backend', 'database'],
      storyPoints: 3,
      columnId: review.id,
      boardId: board.id,
      sprintId: sprint.id,
      order: 0,
    },
  });
  await prisma.taskAssignee.create({ data: { taskId: t3.id, userId: atheek.id } });
  await prisma.subtask.createMany({ data: [
    { title: 'Define all Prisma models', completed: true, taskId: t3.id },
    { title: 'Set up relations and indexes', completed: true, taskId: t3.id },
    { title: 'Run and verify migrations', completed: true, taskId: t3.id },
  ]});
  await prisma.comment.create({ data: { content: 'Schema looks solid. Ready for review.', taskId: t3.id, authorId: atheek.id } });
  await prisma.activityLog.createMany({ data: [
    { action: 'Task created', taskId: t3.id, userId: pm.id },
    { action: 'Assigned to Atheek', taskId: t3.id, userId: pm.id },
    { action: 'Moved to Review', taskId: t3.id, userId: atheek.id },
  ]});

  // ─── SARAH'S TASKS ──────────────────────────────────────────────────────────

  // Task 4 - Sarah only
  const t4 = await prisma.task.create({
    data: {
      title: 'Build dashboard UI',
      description: 'Design and implement the main dashboard page showing all boards, quick stats, and recent activity.',
      priority: Priority.HIGH,
      labels: ['frontend', 'ui'],
      storyPoints: 6,
      columnId: inProgress.id,
      boardId: board.id,
      sprintId: sprint.id,
      order: 1,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.taskAssignee.create({ data: { taskId: t4.id, userId: sarah.id } });
  await prisma.subtask.createMany({ data: [
    { title: 'Create board cards component', completed: true, taskId: t4.id },
    { title: 'Add empty state design', completed: true, taskId: t4.id },
    { title: 'Connect to API', completed: false, taskId: t4.id },
    { title: 'Add loading skeleton', completed: false, taskId: t4.id },
  ]});
  await prisma.comment.create({ data: { content: 'Board cards are done, now wiring up the API calls.', taskId: t4.id, authorId: sarah.id } });
  await prisma.activityLog.createMany({ data: [
    { action: 'Task created', taskId: t4.id, userId: pm.id },
    { action: 'Assigned to Sarah', taskId: t4.id, userId: pm.id },
    { action: 'Moved to In Progress', taskId: t4.id, userId: sarah.id },
  ]});

  // Task 5 - Sarah only
  const t5 = await prisma.task.create({
    data: {
      title: 'Implement task detail modal',
      description: 'Build the task detail drawer/modal with subtasks, comments, activity log, and assignee management.',
      priority: Priority.MEDIUM,
      labels: ['frontend', 'ui'],
      storyPoints: 5,
      columnId: sprintReady.id,
      boardId: board.id,
      sprintId: sprint.id,
      order: 1,
    },
  });
  await prisma.taskAssignee.create({ data: { taskId: t5.id, userId: sarah.id } });
  await prisma.subtask.createMany({ data: [
    { title: 'Design modal layout', completed: false, taskId: t5.id },
    { title: 'Add subtask checklist', completed: false, taskId: t5.id },
    { title: 'Add comments section', completed: false, taskId: t5.id },
    { title: 'Show activity feed', completed: false, taskId: t5.id },
  ]});
  await prisma.activityLog.createMany({ data: [
    { action: 'Task created', taskId: t5.id, userId: pm.id },
    { action: 'Assigned to Sarah', taskId: t5.id, userId: pm.id },
  ]});

  // ─── SHARED TASK - Atheek + Sarah ────────────────────────────────────────────

  const t6 = await prisma.task.create({
    data: {
      title: 'Real-time collaboration with Socket.io',
      description: 'Implement WebSocket rooms per board. Backend emits events, frontend listens and updates state instantly for all connected users.',
      priority: Priority.HIGH,
      labels: ['backend', 'frontend', 'realtime'],
      storyPoints: 8,
      columnId: inProgress.id,
      boardId: board.id,
      sprintId: sprint.id,
      order: 2,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.taskAssignee.createMany({ data: [
    { taskId: t6.id, userId: atheek.id },
    { taskId: t6.id, userId: sarah.id },
  ]});
  await prisma.subtask.createMany({ data: [
    { title: 'Set up Socket.io server', completed: true, taskId: t6.id },
    { title: 'Create board rooms', completed: true, taskId: t6.id },
    { title: 'Emit task events from backend', completed: false, taskId: t6.id },
    { title: 'Handle events on frontend', completed: false, taskId: t6.id },
    { title: 'Test multi-user sync', completed: false, taskId: t6.id },
  ]});
  await prisma.comment.create({ data: { content: 'Socket server is up. Atheek is handling the emit side, I am wiring the frontend listeners.', taskId: t6.id, authorId: sarah.id } });
  await prisma.comment.create({ data: { content: 'Board rooms working. Will push the event emitters today.', taskId: t6.id, authorId: atheek.id } });
  await prisma.comment.create({ data: { content: 'Great teamwork on this one. Keep the momentum!', taskId: t6.id, authorId: pm.id } });
  await prisma.activityLog.createMany({ data: [
    { action: 'Task created', taskId: t6.id, userId: pm.id },
    { action: 'Assigned to Atheek and Sarah', taskId: t6.id, userId: pm.id },
    { action: 'Moved to In Progress', taskId: t6.id, userId: atheek.id },
  ]});

  // ─── AHMAD'S TASKS ──────────────────────────────────────────────────────────

  // Task 7 - Ahmad only
  const t7 = await prisma.task.create({
    data: {
      title: 'Set up CI/CD pipeline',
      description: 'Configure GitHub Actions for automated testing, building, and deployment to production.',
      priority: Priority.MEDIUM,
      labels: ['devops'],
      storyPoints: 3,
      columnId: backlog.id,
      boardId: board.id,
      order: 0,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.taskAssignee.create({ data: { taskId: t7.id, userId: ahmad.id } });
  await prisma.subtask.createMany({ data: [
    { title: 'Create GitHub Actions workflow', completed: false, taskId: t7.id },
    { title: 'Add build and test steps', completed: false, taskId: t7.id },
    { title: 'Configure deployment step', completed: false, taskId: t7.id },
  ]});
  await prisma.activityLog.createMany({ data: [
    { action: 'Task created', taskId: t7.id, userId: pm.id },
    { action: 'Assigned to Ahmad', taskId: t7.id, userId: pm.id },
  ]});

  // Task 8 - Ahmad only
  const t8 = await prisma.task.create({
    data: {
      title: 'Write unit and integration tests',
      description: 'Write tests for all API routes and critical frontend components. Aim for 80% coverage.',
      priority: Priority.MEDIUM,
      labels: ['testing', 'quality'],
      storyPoints: 5,
      columnId: backlog.id,
      boardId: board.id,
      sprintId: sprint.id,
      order: 1,
    },
  });
  await prisma.taskAssignee.create({ data: { taskId: t8.id, userId: ahmad.id } });
  await prisma.subtask.createMany({ data: [
    { title: 'Test auth routes', completed: false, taskId: t8.id },
    { title: 'Test board CRUD', completed: false, taskId: t8.id },
    { title: 'Test task drag and drop', completed: false, taskId: t8.id },
    { title: 'Test real-time events', completed: false, taskId: t8.id },
  ]});
  await prisma.activityLog.createMany({ data: [
    { action: 'Task created', taskId: t8.id, userId: pm.id },
    { action: 'Assigned to Ahmad', taskId: t8.id, userId: pm.id },
  ]});

  // Task 9 - Ahmad only
  const t9 = await prisma.task.create({
    data: {
      title: 'Deploy app to production',
      description: 'Deploy frontend to Vercel and backend to Railway. Set up environment variables and verify everything works in prod.',
      priority: Priority.HIGH,
      labels: ['devops', 'deployment'],
      storyPoints: 4,
      columnId: qa.id,
      boardId: board.id,
      sprintId: sprint.id,
      order: 0,
      dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.taskAssignee.create({ data: { taskId: t9.id, userId: ahmad.id } });
  await prisma.subtask.createMany({ data: [
    { title: 'Deploy frontend to Vercel', completed: true, taskId: t9.id },
    { title: 'Deploy backend to Railway', completed: true, taskId: t9.id },
    { title: 'Set up production env variables', completed: true, taskId: t9.id },
    { title: 'Smoke test in production', completed: false, taskId: t9.id },
  ]});
  await prisma.comment.create({ data: { content: 'Frontend and backend are live. Running smoke tests now.', taskId: t9.id, authorId: ahmad.id } });
  await prisma.comment.create({ data: { content: 'Excellent! Let me know once smoke tests pass and we can sign off.', taskId: t9.id, authorId: pm.id } });
  await prisma.activityLog.createMany({ data: [
    { action: 'Task created', taskId: t9.id, userId: pm.id },
    { action: 'Assigned to Ahmad', taskId: t9.id, userId: pm.id },
    { action: 'Moved to QA', taskId: t9.id, userId: ahmad.id },
  ]});

  // ─── Meeting ─────────────────────────────────────────────────────────────────
  const meeting = await prisma.meeting.create({
    data: {
      title: 'Sprint 1 Planning',
      description: 'Plan sprint tasks, assign work to the team, and set priorities for the next two weeks.',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      boardId: board.id,
      sprintId: sprint.id,
      organizerId: pm.id,
    },
  });

  await prisma.meetingParticipant.createMany({
    data: [
      { meetingId: meeting.id, userId: pm.id },
      { meetingId: meeting.id, userId: atheek.id },
      { meetingId: meeting.id, userId: sarah.id },
      { meetingId: meeting.id, userId: ahmad.id },
    ],
  });

  const meeting2 = await prisma.meeting.create({
    data: {
      title: 'Real-time Feature Sync',
      description: 'Atheek and Sarah to sync on Socket.io implementation progress and unblock any issues.',
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      boardId: board.id,
      sprintId: sprint.id,
      organizerId: pm.id,
    },
  });

  await prisma.meetingParticipant.createMany({
    data: [
      { meetingId: meeting2.id, userId: pm.id },
      { meetingId: meeting2.id, userId: atheek.id },
      { meetingId: meeting2.id, userId: sarah.id },
    ],
  });

  console.log('✅ Seed complete!');
  console.log('');
  console.log('Demo accounts:');
  console.log('  PM:       lubna@outerspace.dev   / 123456');
  console.log('  Engineer: atheek@outerspace.dev  / password123');
  console.log('  Engineer: sarah@outerspace.dev   / password123');
  console.log('  Engineer: ahmad@outerspace.dev   / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });