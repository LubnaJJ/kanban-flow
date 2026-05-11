import prisma from './prisma';

export async function logActivity(
  taskId: string,
  userId: string,
  action: string,
  metadata?: Record<string, unknown>
) {
  return prisma.activityLog.create({
    data: { taskId, userId, action },
  });
}