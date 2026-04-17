import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authenticateRestaurant } from '../middleware/restaurant-auth.middleware';
import { signAccessToken, signRefreshToken } from '../utils/jwt';
import { SlotService } from '../services/slot.service';
import { ReviewService } from '../services/review.service';

export const restaurantPanelRoutes = async (fastify: FastifyInstance) => {
  const slotService = new SlotService(fastify.prisma);
  const reviewService = new ReviewService(fastify.prisma);

  fastify.post('/auth/login', async (request, reply) => {
    const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(request.body);

    const owner = await fastify.prisma.restaurantOwner.findUnique({ where: { email } });
    if (!owner) return reply.code(401).send({ message: 'Credenciales incorrectas' });

    const valid = await bcrypt.compare(password, owner.passwordHash);
    if (!valid) return reply.code(401).send({ message: 'Credenciales incorrectas' });

    return {
      accessToken: signAccessToken({ sub: owner.restaurantId, type: 'restaurant' }),
      refreshToken: signRefreshToken({ sub: owner.restaurantId, type: 'restaurant' }),
    };
  });

  fastify.post('/auth/register', async (request, reply) => {
    const body = z.object({
      name: z.string(),
      description: z.string().optional(),
      cuisineType: z.array(z.string()),
      priceRange: z.number().int().min(1).max(4),
      phone: z.string().optional(),
      email: z.string().email(),
      address: z.string(),
      parish: z.enum(['ANDORRA_LA_VELLA', 'ESCALDES_ENGORDANY', 'ENCAMP', 'CANILLO', 'LA_MASSANA', 'ORDINO', 'SANT_JULIA_DE_LORIA']),
      latitude: z.number(),
      longitude: z.number(),
      ownerName: z.string(),
      ownerEmail: z.string().email(),
      ownerPassword: z.string().min(8),
    }).parse(request.body);

    const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const restaurant = await fastify.prisma.restaurant.create({
      data: {
        name: body.name,
        slug,
        description: body.description,
        cuisineType: body.cuisineType,
        priceRange: body.priceRange,
        phone: body.phone,
        email: body.email,
        address: body.address,
        parish: body.parish,
        latitude: body.latitude,
        longitude: body.longitude,
        isActive: false,
      },
    });

    const passwordHash = await bcrypt.hash(body.ownerPassword, 12);
    await fastify.prisma.restaurantOwner.create({
      data: {
        restaurantId: restaurant.id,
        email: body.ownerEmail,
        name: body.ownerName,
        passwordHash,
      },
    });

    return reply.code(201).send({ data: restaurant, message: 'Restaurante registrado. Pendiente de aprobacion.' });
  });

  fastify.get('/me', { preHandler: [authenticateRestaurant] }, async (request) => {
    const restaurant = await fastify.prisma.restaurant.findUnique({
      where: { id: request.restaurantId },
      include: { hours: true, owner: true },
    });
    return { data: restaurant };
  });

  fastify.patch('/me', { preHandler: [authenticateRestaurant] }, async (request) => {
    const body = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().url().optional(),
      cuisineType: z.array(z.string()).optional(),
      priceRange: z.number().int().min(1).max(4).optional(),
    }).parse(request.body);

    const restaurant = await fastify.prisma.restaurant.update({
      where: { id: request.restaurantId },
      data: body,
    });
    return { data: restaurant };
  });

  fastify.get('/reservations', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { date, status } = z.object({
      date: z.string().optional(),
      status: z.string().optional(),
    }).parse(request.query);

    const where: any = { restaurantId: request.restaurantId };
    if (date) where.date = new Date(date);
    if (status) where.status = status;

    const reservations = await fastify.prisma.reservation.findMany({
      where,
      include: { user: { select: { name: true, email: true, phone: true } } },
      orderBy: { time: 'asc' },
    });
    return { data: reservations };
  });

  fastify.patch('/reservations/:id', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { status } = z.object({ status: z.enum(['ARRIVED', 'NO_SHOW', 'CANCELLED_RESTAURANT']) }).parse(request.body);

    const reservation = await fastify.prisma.$transaction(async (tx) => {
      const current = await tx.reservation.findFirst({
        where: { id, restaurantId: request.restaurantId },
      });
      if (!current) throw new Error('Reserva no encontrada');

      const updated = await tx.reservation.update({
        where: { id },
        data: { status },
      });

      if (status === 'CANCELLED_RESTAURANT' && current.status === 'CONFIRMED') {
        await tx.availabilitySlot.update({
          where: { id: current.slotId },
          data: { bookedCovers: { decrement: current.partySize } },
        });
      }

      return updated;
    });

    return { data: reservation };
  });

  fastify.get('/slots', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { date } = z.object({ date: z.string().optional() }).parse(request.query);
    const where: any = { restaurantId: request.restaurantId };
    if (date) where.date = new Date(date);

    const slots = await fastify.prisma.availabilitySlot.findMany({
      where,
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });
    return { data: slots };
  });

  fastify.post('/slots/block', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { slotId } = z.object({ slotId: z.string() }).parse(request.body);
    const slot = await slotService.blockSlot(request.restaurantId, slotId);
    return { data: slot };
  });

  fastify.delete('/slots/block/:id', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const slot = await slotService.unblockSlot(request.restaurantId, id);
    return { data: slot };
  });

  fastify.get('/stats', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { from, to } = z.object({ from: z.string().optional(), to: z.string().optional() }).parse(request.query);

    const where: any = { restaurantId: request.restaurantId };
    if (from && to) {
      where.createdAt = { gte: new Date(from), lte: new Date(to) };
    }

    const [totalReservations, arrivedCount, noShowCount, cancelledCount] = await Promise.all([
      fastify.prisma.reservation.count({ where }),
      fastify.prisma.reservation.count({ where: { ...where, status: 'ARRIVED' } }),
      fastify.prisma.reservation.count({ where: { ...where, status: 'NO_SHOW' } }),
      fastify.prisma.reservation.count({
        where: { ...where, status: { in: ['CANCELLED_USER', 'CANCELLED_RESTAURANT'] } },
      }),
    ]);

    const totalCovers = await fastify.prisma.reservation.aggregate({
      where: { ...where, status: 'ARRIVED' },
      _sum: { partySize: true },
    });

    return {
      data: {
        totalReservations,
        arrived: arrivedCount,
        noShows: noShowCount,
        cancelled: cancelledCount,
        totalCoversServed: totalCovers._sum.partySize || 0,
      },
    };
  });

  fastify.post('/reviews/:id/reply', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { reply: replyText } = z.object({ reply: z.string().max(500) }).parse(request.body);
    const review = await reviewService.replyToReview(id, request.restaurantId, replyText);
    return { data: review };
  });
};
