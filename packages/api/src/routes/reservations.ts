import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createReservationSchema } from '@taula/shared';
import { authenticate } from '../middleware/auth.middleware';
import { ReservationService } from '../services/reservation.service';
import { StripeService } from '../services/stripe.service';

export const reservationRoutes = async (fastify: FastifyInstance) => {
  const service = new ReservationService(fastify.prisma);
  const stripeService = new StripeService(fastify.prisma);

  fastify.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const body = createReservationSchema.parse(request.body);
    const reservation = await service.create(request.userId, body);
    return reply.code(201).send({ data: reservation });
  });

  fastify.get('/', { preHandler: [authenticate] }, async (request) => {
    const reservations = await service.getUserReservations(request.userId);
    return { data: reservations, meta: { total: reservations.length, nextCursor: null } };
  });

  fastify.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const reservation = await service.getById(request.userId, id);
    if (!reservation) return reply.code(404).send({ message: 'Reserva no encontrada' });
    return { data: reservation };
  });

  fastify.patch('/:id/cancel', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const reservation = await service.cancelByUser(request.userId, id);
    return { data: reservation };
  });

  // ─── STRIPE / CARD GUARANTEE ───────────────────────────────────

  fastify.post('/setup-intent', { preHandler: [authenticate] }, async (request, reply) => {
    if (!stripeService.isAvailable()) {
      return reply.code(503).send({ message: 'Payment service unavailable' });
    }
    const result = await stripeService.createSetupIntent(request.userId);
    return { data: result };
  });

  fastify.get('/payment-methods', { preHandler: [authenticate] }, async (request, reply) => {
    if (!stripeService.isAvailable()) {
      return { data: [] };
    }
    const methods = await stripeService.listPaymentMethods(request.userId);
    return {
      data: methods.map((m) => ({
        id: m.id,
        brand: m.card?.brand,
        last4: m.card?.last4,
        expMonth: m.card?.exp_month,
        expYear: m.card?.exp_year,
      })),
    };
  });

  /**
   * Attach a saved payment method to a reservation (card guarantee).
   * Called after the user confirms the reservation at a no-show-protected restaurant.
   */
  fastify.post('/:id/card-guarantee', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { paymentMethodId } = z.object({ paymentMethodId: z.string() }).parse(request.body);

    const reservation = await fastify.prisma.reservation.findFirst({
      where: { id, userId: request.userId },
    });
    if (!reservation) return reply.code(404).send({ message: 'Reserva no encontrada' });

    await fastify.prisma.reservation.update({
      where: { id },
      data: {
        cardGuarantee: true,
        stripePaymentMethodId: paymentMethodId,
      },
    });

    return { data: { success: true } };
  });
};
