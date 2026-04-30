import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { signAccessToken, signRefreshToken } from '../utils/jwt';

export const meRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/', { preHandler: [authenticate] }, async (request) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        phone: true,
        preferredLang: true,
        createdAt: true,
      },
    });
    return { data: user };
  });

  fastify.get('/ownerships', { preHandler: [authenticate] }, async (request) => {
    const ownerships = await fastify.prisma.restaurantOwner.findMany({
      where: { userId: request.userId },
      include: {
        restaurant: {
          include: {
            subscription: {
              select: { plan: true, status: true, adminGrantUntil: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      data: ownerships.map((o) => ({
        restaurantId: o.restaurantId,
        restaurantName: o.restaurant.name,
        restaurantSlug: o.restaurant.slug,
        coverImage: o.restaurant.coverImage,
        role: o.role,
        plan: o.restaurant.subscription?.plan ?? null,
        subscriptionStatus: o.restaurant.subscription?.status ?? null,
      })),
    };
  });

  /**
   * Devuelve un access/refresh token de tipo "restaurant" para el restaurante
   * indicado, validando que el usuario autenticado sea owner.
   * Permite cambiar de modo en cliente sin pasar por /restaurant/auth/login.
   */
  fastify.post(
    '/restaurant-token',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { restaurantId } = z
        .object({ restaurantId: z.string() })
        .parse(request.body);

      const ownership = await fastify.prisma.restaurantOwner.findFirst({
        where: { userId: request.userId, restaurantId },
        include: {
          restaurant: {
            select: { name: true, slug: true, subscription: { select: { plan: true, status: true } } },
          },
        },
      });
      if (!ownership) {
        return reply.code(403).send({ message: 'No eres propietario de este restaurante' });
      }

      return {
        accessToken: signAccessToken({ sub: restaurantId, type: 'restaurant' }),
        refreshToken: signRefreshToken({ sub: restaurantId, type: 'restaurant' }),
        restaurantName: ownership.restaurant.name,
        restaurantSlug: ownership.restaurant.slug,
        plan: ownership.restaurant.subscription?.plan ?? null,
        subscriptionStatus: ownership.restaurant.subscription?.status ?? null,
      };
    },
  );

  fastify.patch('/', { preHandler: [authenticate] }, async (request) => {
    const body = z
      .object({
        name: z.string().min(2).max(100).optional(),
        phone: z.string().optional(),
        preferredLang: z.enum(['ca', 'es', 'en', 'fr']).optional(),
      })
      .parse(request.body);

    const user = await fastify.prisma.user.update({
      where: { id: request.userId },
      data: body,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        phone: true,
        preferredLang: true,
        createdAt: true,
      },
    });
    return { data: user };
  });

  fastify.delete('/', { preHandler: [authenticate] }, async (request, reply) => {
    await fastify.prisma.user.delete({ where: { id: request.userId } });
    return reply.code(204).send();
  });

  fastify.post('/push-token', { preHandler: [authenticate] }, async (request) => {
    const { token } = z.object({ token: z.string() }).parse(request.body);
    await fastify.prisma.user.update({
      where: { id: request.userId },
      data: { pushToken: token },
    });
    return { message: 'Token registrado' };
  });
};
