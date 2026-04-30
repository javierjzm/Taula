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
    const { date, partySize, zoneId } = z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        partySize: z.coerce.number().int().min(1).max(20),
        zoneId: z.string().optional(),
      })
      .parse(request.query);

    const restaurant = await service.findBySlug(slug);
    if (!restaurant) return reply.code(404).send({ message: 'Restaurante no encontrado' });

    if ((restaurant as any).isListingOnly) {
      return { data: [], meta: { listingOnly: true, externalReservationUrl: restaurant.externalReservationUrl } };
    }

    const { AvailabilityService } = await import('../services/availability.service');
    const availabilityService = new AvailabilityService(fastify.prisma);
    let slots = await availabilityService.getAvailableSlots(restaurant.id, date, partySize, zoneId);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (date === todayStr) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const minAdvance = restaurant.minAdvanceMinutes ?? 0;
      const cutoff = currentMinutes + Math.max(minAdvance, 30);
      slots = slots.filter((s) => {
        const [h, m] = s.time.split(':').map(Number);
        return h * 60 + m >= cutoff;
      });
    }

    return { data: slots };
  });

  fastify.get('/:slug/zones', async (request, reply) => {
    const { slug } = z.object({ slug: z.string() }).parse(request.params);
    const restaurant = await service.findBySlug(slug);
    if (!restaurant) return reply.code(404).send({ message: 'Restaurante no encontrado' });

    const zones = await fastify.prisma.zone.findMany({
      where: { restaurantId: restaurant.id },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    });
    return { data: zones };
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

  // ─── CARTA ─────────────────────────────────────────────────────
  fastify.get('/:slug/menu', async (request, reply) => {
    const { slug } = z.object({ slug: z.string() }).parse(request.params);
    const restaurant = await service.findBySlug(slug);
    if (!restaurant) return reply.code(404).send({ message: 'Restaurante no encontrado' });

    const categories = await fastify.prisma.menuCategory.findMany({
      where: { restaurantId: restaurant.id, isActive: true },
      include: {
        items: {
          where: { isAvailable: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return { data: categories };
  });

  // ─── OFERTAS ACTIVAS ──────────────────────────────────────────
  fastify.get('/:slug/offers', async (request, reply) => {
    const { slug } = z.object({ slug: z.string() }).parse(request.params);
    const restaurant = await service.findBySlug(slug);
    if (!restaurant) return reply.code(404).send({ message: 'Restaurante no encontrado' });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = now.getDay();

    const offers = await fastify.prisma.offer.findMany({
      where: {
        restaurantId: restaurant.id,
        isActive: true,
        OR: [
          { startDate: null },
          { startDate: { lte: today } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    const filtered = offers.filter((o) => {
      if (o.endDate && o.endDate < today) return false;
      if (o.daysOfWeek.length > 0 && !o.daysOfWeek.includes(dayOfWeek)) return false;
      return true;
    });

    return { data: filtered };
  });
};
