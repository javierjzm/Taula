import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const adminAuth = async (request: any, reply: any) => {
  const adminKey = request.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return reply.code(403).send({ message: 'Acceso denegado' });
  }
};

export const adminRoutes = async (fastify: FastifyInstance) => {
  fastify.addHook('preHandler', adminAuth);

  fastify.get('/restaurants/pending', async () => {
    return fastify.prisma.restaurant.findMany({
      where: { isActive: false },
      include: { owner: true },
      orderBy: { createdAt: 'asc' },
    });
  });

  fastify.patch('/restaurants/:id/approve', async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const restaurant = await fastify.prisma.restaurant.update({
      where: { id },
      data: { isActive: true },
    });

    const { SlotService } = await import('../services/slot.service');
    const slotService = new SlotService(fastify.prisma);
    await slotService.generateSlotsForRestaurant(id);

    return { data: restaurant };
  });

  fastify.patch('/restaurants/:id/reject', async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await fastify.prisma.restaurant.delete({ where: { id } });
    return { message: 'Restaurante rechazado y eliminado' };
  });

  fastify.get('/stats', async () => {
    const [totalRestaurants, activeRestaurants, totalReservations, totalUsers] =
      await Promise.all([
        fastify.prisma.restaurant.count(),
        fastify.prisma.restaurant.count({ where: { isActive: true } }),
        fastify.prisma.reservation.count({ where: { status: 'CONFIRMED' } }),
        fastify.prisma.user.count(),
      ]);

    return {
      data: { totalRestaurants, activeRestaurants, totalReservations, totalUsers },
    };
  });
};
