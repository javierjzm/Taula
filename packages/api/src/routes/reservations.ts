import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createReservationSchema } from '@taula/shared';
import { authenticate } from '../middleware/auth.middleware';
import { ReservationService } from '../services/reservation.service';

export const reservationRoutes = async (fastify: FastifyInstance) => {
  const service = new ReservationService(fastify.prisma);

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
};
