import { FastifyRequest, FastifyReply } from 'fastify';
import { Role } from '@prisma/client';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ success: false, error: 'Unauthorized' });
  }
}

export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    const user = request.user as { role: Role };
    if (!roles.includes(user.role)) {
      reply.code(403).send({ success: false, error: 'Forbidden: insufficient permissions' });
    }
  };
}

export function requirePM(request: FastifyRequest, reply: FastifyReply) {
  return requireRole(Role.PM)(request, reply);
}
