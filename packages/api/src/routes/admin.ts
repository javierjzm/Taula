import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { grantPlanSchema, planTypeSchema } from '@taula/shared';
import { SubscriptionService } from '../services/subscription.service';

const adminAuth = async (request: any, reply: any) => {
  const adminKey = request.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return reply.code(403).send({ message: 'Acceso denegado' });
  }
};

export const adminRoutes = async (fastify: FastifyInstance) => {
  fastify.addHook('preHandler', adminAuth);
  const subService = new SubscriptionService(fastify.prisma);

  fastify.get('/restaurants', async (request) => {
    const { plan, status, q } = z
      .object({
        plan: planTypeSchema.optional(),
        status: z.string().optional(),
        q: z.string().optional(),
      })
      .parse(request.query);

    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (plan) where.subscription = { plan };
    if (status) where.subscription = { ...(where.subscription ?? {}), status };

    const restaurants = await fastify.prisma.restaurant.findMany({
      where,
      include: {
        subscription: true,
        owners: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: restaurants };
  });

  fastify.get('/restaurants/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const restaurant = await fastify.prisma.restaurant.findUnique({
      where: { id },
      include: {
        subscription: true,
        owners: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { reservations: true, reviews: true } },
      },
    });
    if (!restaurant) return reply.code(404).send({ message: 'No encontrado' });
    return { data: restaurant };
  });

  fastify.get('/restaurants/pending', async () => {
    const list = await fastify.prisma.restaurant.findMany({
      where: { isActive: false },
      include: {
        subscription: true,
        owners: { include: { user: { select: { name: true, email: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return { data: list };
  });

  fastify.patch('/restaurants/:id/approve', async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const restaurant = await fastify.prisma.restaurant.update({
      where: { id },
      data: { isActive: true },
    });
    return { data: restaurant };
  });

  fastify.patch('/restaurants/:id/reject', async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await fastify.prisma.restaurant.delete({ where: { id } });
    return { message: 'Restaurante rechazado y eliminado' };
  });

  fastify.post('/restaurants/:id/grant-plan', async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = grantPlanSchema.parse(request.body);
    await subService.grantPlanByAdmin(id, body.plan, body.until ? new Date(body.until) : undefined);
    return { data: { success: true } };
  });

  fastify.post('/restaurants/:id/revoke-plan', async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await subService.revokePlanByAdmin(id);
    return { data: { success: true } };
  });

  fastify.get('/users', async () => {
    const users = await fastify.prisma.user.findMany({
      include: {
        ownerships: {
          include: { restaurant: { select: { id: true, name: true, slug: true } } },
        },
        _count: { select: { reservations: true, reviews: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return { data: users };
  });

  fastify.get('/stats', async () => {
    const [totalRestaurants, activeRestaurants, totalReservations, totalUsers, plans] =
      await Promise.all([
        fastify.prisma.restaurant.count(),
        fastify.prisma.restaurant.count({ where: { isActive: true } }),
        fastify.prisma.reservation.count({ where: { status: 'CONFIRMED' } }),
        fastify.prisma.user.count(),
        fastify.prisma.subscription.groupBy({
          by: ['plan', 'status'],
          _count: { _all: true },
        }),
      ]);

    return {
      data: { totalRestaurants, activeRestaurants, totalReservations, totalUsers, plans },
    };
  });
};
