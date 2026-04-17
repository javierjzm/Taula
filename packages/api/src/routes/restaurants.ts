import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RestaurantService } from '../services/restaurant.service';

export const restaurantRoutes = async (fastify: FastifyInstance) => {
  const service = new RestaurantService(fastify.prisma);

  fastify.get('/', async (request) => {
    const query = z
      .object({
        q: z.string().optional(),
        lat: z.coerce.number().optional(),
        lon: z.coerce.number().optional(),
        radius: z.coerce.number().default(50000),
        parish: z.string().optional(),
        cuisine: z.string().optional(),
        priceRange: z
          .string()
          .transform((v) => v.split(',').map(Number))
          .optional(),
        minRating: z.coerce.number().optional(),
        openNow: z.coerce.boolean().optional(),
        featured: z.coerce.boolean().optional(),
        limit: z.coerce.number().max(50).default(20),
        cursor: z.string().optional(),
      })
      .parse(request.query);

    const restaurants = await service.findMany(query);
    return {
      data: restaurants,
      meta: { total: restaurants.length, nextCursor: restaurants.at(-1)?.id ?? null },
    };
  });

  fastify.get('/:slug', async (request, reply) => {
    const { slug } = z.object({ slug: z.string() }).parse(request.params);
    const restaurant = await service.findBySlug(slug);
    if (!restaurant) return reply.code(404).send({ message: 'Restaurante no encontrado' });
    return { data: restaurant };
  });

  fastify.get('/:slug/slots', async (request, reply) => {
    const { slug } = z.object({ slug: z.string() }).parse(request.params);
    const { date, partySize } = z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        partySize: z.coerce.number().int().min(1).max(20),
      })
      .parse(request.query);

    const restaurant = await service.findBySlug(slug);
    if (!restaurant) return reply.code(404).send({ message: 'Restaurante no encontrado' });

    const slots = await service.getAvailableSlots(restaurant.id, date, partySize);
    return { data: slots };
  });

  fastify.get('/:slug/reviews', async (request) => {
    const { slug } = z.object({ slug: z.string() }).parse(request.params);
    const { cursor, limit } = z
      .object({ cursor: z.string().optional(), limit: z.coerce.number().default(10) })
      .parse(request.query);
    
    const restaurant = await service.findBySlug(slug);
    if (!restaurant) return { data: [] };
    
    const { ReviewService } = await import('../services/review.service');
    const reviewService = new ReviewService(fastify.prisma);
    const reviews = await reviewService.findByRestaurant(restaurant.id, cursor, limit);
    return { data: reviews };
  });
};
