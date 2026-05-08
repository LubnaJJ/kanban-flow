import { FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../lib/prisma';

export async function requireBoardMember(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user as { id: string };
  const params = request.params as { boardId?: string };
  const boardId = params.boardId;

  if (!boardId) {
    return reply.code(400).send({ success: false, error: 'boardId param missing' });
  }

  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });

  if (!membership) {
    reply.code(403).send({ success: false, error: 'You are not a member of this board' });
  }
}
