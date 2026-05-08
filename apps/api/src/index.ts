import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { Server } from 'socket.io';
import prisma from './lib/prisma';

import { authRoutes } from './routes/auth';
import { boardRoutes } from './routes/boards';
import { columnRoutes } from './routes/columns';
import { taskRoutes } from './routes/tasks';
import { subtaskRoutes, commentRoutes, sprintRoutes, meetingRoutes } from './routes/extras';

declare module 'fastify' {
  interface FastifyInstance {
    io: Server;
  }
}

async function start() {
  const app = Fastify({
    logger: { level: process.env.NODE_ENV === 'production' ? 'warn' : 'info' },
  });

  await app.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
  });

  const io = new Server({
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  app.decorate('io', io);

  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(boardRoutes, { prefix: '/api/boards' });
  app.register(columnRoutes, { prefix: '/api/boards' });
  app.register(taskRoutes, { prefix: '/api/boards' });
  app.register(subtaskRoutes, { prefix: '/api/boards' });
  app.register(commentRoutes, { prefix: '/api/boards' });
  app.register(sprintRoutes, { prefix: '/api/boards' });
  app.register(meetingRoutes, { prefix: '/api/boards' });

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = app.jwt.verify(token) as { id: string; role: string; name: string };
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  function getOnlineUsers(boardId: string): string[] {
    const room = io.sockets.adapter.rooms.get(boardId);
    if (!room) return [];
    return Array.from(room)
      .map(sid => io.sockets.sockets.get(sid)?.data?.user?.id)
      .filter(Boolean) as string[];
  }

  io.on('connection', (socket) => {
    const user = socket.data.user;
    app.log.info(`Socket connected: ${user?.name} (${socket.id})`);

    socket.on('join:board', (boardId: string) => {
      socket.join(boardId);
      app.log.info(`${user?.name} joined board room: ${boardId}`);
      // Broadcast presence update to everyone in the room
      setTimeout(() => {
        io.to(boardId).emit('presence:update', { onlineUsers: getOnlineUsers(boardId) });
      }, 100);
    });

    socket.on('leave:board', (boardId: string) => {
      socket.leave(boardId);
      setTimeout(() => {
        io.to(boardId).emit('presence:update', { onlineUsers: getOnlineUsers(boardId) });
      }, 100);
    });

    socket.on('disconnect', () => {
      app.log.info(`Socket disconnected: ${user?.name}`);
      // Broadcast presence update to all rooms this socket was in
      socket.rooms.forEach(roomId => {
        if (roomId !== socket.id) {
          setTimeout(() => {
            io.to(roomId).emit('presence:update', { onlineUsers: getOnlineUsers(roomId) });
          }, 100);
        }
      });
    });
  });

  try {
    await prisma.$connect();
    app.log.info('Database connected');

    const port = parseInt(process.env.PORT || '4000');
    await app.listen({ port, host: '0.0.0.0' });
    io.attach(app.server);
    app.log.info(`Server running on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

start();