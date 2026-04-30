import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { notificationPreferencesSchema } from '@taula/shared';
import { authenticate } from '../middleware/auth.middleware';
import { authenticateRestaurant } from '../middleware/restaurant-auth.middleware';
import { NotificationService } from '../services/notification.service';

export const notificationRoutes = async (fastify: FastifyInstance) => {
  const service = new NotificationService(fastify.prisma);

  fastify.get('/', { preHandler: [authenticate] }, async (request) => {
    const { cursor, take } = z
      .object({ cursor: z.string().optional(), take: z.coerce.number().max(100).optional() })
      .parse(request.query);
    const { items, unread } = await service.listForUser(request.userId, { cursor, take });
    return {
      data: items,
      meta: { total: items.length, unread, nextCursor: items.at(-1)?.id ?? null },
    };
  });

  fastify.patch('/:id/read', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const ok = await service.markRead('USER', request.userId, id);
    if (!ok) return reply.code(404).send({ message: 'Notificacion no encontrada' });
    return { data: { success: true } };
  });

  fastify.post('/read-all', { preHandler: [authenticate] }, async (request) => {
    await service.markAllRead('USER', request.userId);
    return { data: { success: true } };
  });

  fastify.get('/preferences', { preHandler: [authenticate] }, async (request) => {
    const prefs = await service.getOrCreatePreferences(request.userId);
    return { data: prefs };
  });

  fastify.patch('/preferences', { preHandler: [authenticate] }, async (request) => {
    const body = notificationPreferencesSchema.parse(request.body);
    const prefs = await service.updatePreferences(request.userId, body);
    return { data: prefs };
  });

  // ─── Scope restaurante (requiere token tipo restaurant) ─────────
  fastify.get(
    '/restaurant',
    { preHandler: [authenticateRestaurant] },
    async (request) => {
      const { cursor, take } = z
        .object({ cursor: z.string().optional(), take: z.coerce.number().max(100).optional() })
        .parse(request.query);
      const { items, unread } = await service.listForRestaurant(request.restaurantId, { cursor, take });
      return {
        data: items,
        meta: { total: items.length, unread, nextCursor: items.at(-1)?.id ?? null },
      };
    },
  );

  fastify.patch(
    '/restaurant/:id/read',
    { preHandler: [authenticateRestaurant] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      const ok = await service.markRead('RESTAURANT', request.restaurantId, id);
      if (!ok) return reply.code(404).send({ message: 'Notificacion no encontrada' });
      return { data: { success: true } };
    },
  );

  fastify.post(
    '/restaurant/read-all',
    { preHandler: [authenticateRestaurant] },
    async (request) => {
      await service.markAllRead('RESTAURANT', request.restaurantId);
      return { data: { success: true } };
    },
  );
};
