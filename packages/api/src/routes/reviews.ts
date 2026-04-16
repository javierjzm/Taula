import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { ReviewService } from '../services/review.service';

const createReviewSchema = z.object({
  restaurantId: z.string().cuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const reviewRoutes = async (fastify: FastifyInstance) => {
  const service = new ReviewService(fastify.prisma);

  fastify.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const body = createReviewSchema.parse(request.body);

    const hasReservation = await fastify.prisma.reservation.findFirst({
      where: {
        userId: request.userId,
        restaurantId: body.restaurantId,
        status: 'ARRIVED',
      },
    });
    if (!hasReservation) {
      return reply.code(403).send({
        message: 'Solo puedes reseñar restaurantes donde hayas tenido una reserva confirmada',
      });
    }

    const review = await service.create(request.userId, body);
    return reply.code(201).send({ data: review });
  });

  fastify.get('/restaurant/:id', async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { cursor, limit } = z
      .object({ cursor: z.string().optional(), limit: z.coerce.number().default(10) })
      .parse(request.query);
    const reviews = await service.findByRestaurant(id, cursor, limit);
    return { data: reviews };
  });
};
