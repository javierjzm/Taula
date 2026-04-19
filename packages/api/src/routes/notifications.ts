import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';

export const notificationRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/', { preHandler: [authenticate] }, async (request) => {
    const notifications = await fastify.prisma.notification.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      data: notifications,
      meta: {
        total: notifications.length,
        unread: notifications.filter((n) => !n.read).length,
      },
    };
  });

  fastify.patch('/:id/read', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const notif = await fastify.prisma.notification.findFirst({
      where: { id, userId: request.userId },
    });
    if (!notif) return reply.code(404).send({ message: 'Notificación no encontrada' });

    await fastify.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    return { data: { success: true } };
  });

  fastify.post('/read-all', { preHandler: [authenticate] }, async (request) => {
    await fastify.prisma.notification.updateMany({
      where: { userId: request.userId, read: false },
      data: { read: true },
    });
    return { data: { success: true } };
  });
};
