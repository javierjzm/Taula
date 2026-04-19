import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { authenticateRestaurant } from '../middleware/restaurant-auth.middleware';
import { signAccessToken, signRefreshToken } from '../utils/jwt';
import { AvailabilityService } from '../services/availability.service';
import { ReviewService } from '../services/review.service';
import { CloudinaryService } from '../services/cloudinary.service';

const PARISH_ENUM = z.enum([
  'ANDORRA_LA_VELLA', 'ESCALDES_ENGORDANY', 'ENCAMP', 'CANILLO',
  'LA_MASSANA', 'ORDINO', 'SANT_JULIA_DE_LORIA',
]);

export const restaurantPanelRoutes = async (fastify: FastifyInstance) => {
  const availabilityService = new AvailabilityService(fastify.prisma);
  const reviewService = new ReviewService(fastify.prisma);
  const cloudinaryService = new CloudinaryService();

  // ─── AUTH ────────────────────────────────────────────────────────

  fastify.post('/auth/login', async (request, reply) => {
    const { email, password } = z
      .object({ email: z.string().email(), password: z.string() })
      .parse(request.body);

    const owner = await fastify.prisma.restaurantOwner.findUnique({ where: { email } });
    if (!owner) return reply.code(401).send({ message: 'Credenciales incorrectas' });

    const valid = await bcrypt.compare(password, owner.passwordHash);
    if (!valid) return reply.code(401).send({ message: 'Credenciales incorrectas' });

    const restaurant = await fastify.prisma.restaurant.findUnique({
      where: { id: owner.restaurantId },
      select: { name: true },
    });

    return {
      accessToken: signAccessToken({ sub: owner.restaurantId, type: 'restaurant' }),
      refreshToken: signRefreshToken({ sub: owner.restaurantId, type: 'restaurant' }),
      restaurantName: restaurant?.name ?? '',
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
      parish: PARISH_ENUM,
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

  // ─── PROFILE ─────────────────────────────────────────────────────

  fastify.get('/me', { preHandler: [authenticateRestaurant] }, async (request) => {
    const restaurant = await fastify.prisma.restaurant.findUnique({
      where: { id: request.restaurantId },
      include: { hours: true, owner: true, zones: { include: { tables: true } }, services: true },
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
      coverImage: z.string().url().nullable().optional(),
      images: z.array(z.string().url()).optional(),
    }).parse(request.body);

    const restaurant = await fastify.prisma.restaurant.update({
      where: { id: request.restaurantId },
      data: body,
    });
    return { data: restaurant };
  });

  // ─── UPLOAD ─────────────────────────────────────────────────────

  fastify.post('/upload', { preHandler: [authenticateRestaurant] }, async (request) => {
    const data = await request.file();
    if (!data) return { error: 'No file uploaded' };

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedMimes.includes(data.mimetype)) {
      return { error: 'Formato no soportado. Usa JPG, PNG o WebP.' };
    }

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const maxSize = 10 * 1024 * 1024;
    if (buffer.length > maxSize) return { error: 'Archivo demasiado grande (máx 10 MB)' };

    const folder = (request.query as any).folder === 'menu' ? 'taula/menu' : 'taula/restaurants';
    const result = await cloudinaryService.upload(buffer, folder);
    return { data: result };
  });

  // ─── SETTINGS ────────────────────────────────────────────────────

  fastify.patch('/settings', { preHandler: [authenticateRestaurant] }, async (request) => {
    const body = z.object({
      requiresApproval: z.boolean().optional(),
      minAdvanceMinutes: z.number().int().min(0).optional(),
      maxAdvanceDays: z.number().int().min(1).max(365).optional(),
      noShowProtection: z.boolean().optional(),
      noShowFeePerPerson: z.number().min(0).max(200).optional(),
      noShowGraceMins: z.number().int().min(5).max(60).optional(),
    }).parse(request.body);

    const restaurant = await fastify.prisma.restaurant.update({
      where: { id: request.restaurantId },
      data: body,
    });
    return { data: restaurant };
  });

  // ─── ZONES CRUD ──────────────────────────────────────────────────

  fastify.get('/zones', { preHandler: [authenticateRestaurant] }, async (request) => {
    const zones = await fastify.prisma.zone.findMany({
      where: { restaurantId: request.restaurantId },
      include: { tables: { orderBy: { label: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
    return { data: zones };
  });

  fastify.post('/zones', { preHandler: [authenticateRestaurant] }, async (request) => {
    const body = z.object({
      name: z.string().min(1),
      sortOrder: z.number().int().default(0),
    }).parse(request.body);

    const zone = await fastify.prisma.zone.create({
      data: { ...body, restaurantId: request.restaurantId },
    });
    return { data: zone };
  });

  fastify.put('/zones/:id', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = z.object({
      name: z.string().min(1).optional(),
      sortOrder: z.number().int().optional(),
    }).parse(request.body);

    const zone = await fastify.prisma.zone.updateMany({
      where: { id, restaurantId: request.restaurantId },
      data: body,
    });
    if (zone.count === 0) return { error: 'Zone not found' };

    const updated = await fastify.prisma.zone.findUnique({ where: { id } });
    return { data: updated };
  });

  fastify.delete('/zones/:id', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await fastify.prisma.zone.deleteMany({
      where: { id, restaurantId: request.restaurantId },
    });
    return { success: true };
  });

  // ─── TABLES CRUD ─────────────────────────────────────────────────

  fastify.get('/tables', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { zoneId } = z.object({ zoneId: z.string().optional() }).parse(request.query);
    const where: any = { restaurantId: request.restaurantId };
    if (zoneId) where.zoneId = zoneId;

    const tables = await fastify.prisma.restaurantTable.findMany({
      where,
      include: { zone: true },
      orderBy: { label: 'asc' },
    });
    return { data: tables };
  });

  fastify.post('/tables', { preHandler: [authenticateRestaurant] }, async (request) => {
    const body = z.object({
      zoneId: z.string(),
      label: z.string().min(1),
      minCovers: z.number().int().min(1).default(1),
      maxCovers: z.number().int().min(1),
    }).parse(request.body);

    const zone = await fastify.prisma.zone.findFirst({
      where: { id: body.zoneId, restaurantId: request.restaurantId },
    });
    if (!zone) return { error: 'Zone not found' };

    const table = await fastify.prisma.restaurantTable.create({
      data: { ...body, restaurantId: request.restaurantId },
    });
    return { data: table };
  });

  fastify.put('/tables/:id', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = z.object({
      label: z.string().min(1).optional(),
      minCovers: z.number().int().min(1).optional(),
      maxCovers: z.number().int().min(1).optional(),
      isActive: z.boolean().optional(),
      zoneId: z.string().optional(),
    }).parse(request.body);

    const result = await fastify.prisma.restaurantTable.updateMany({
      where: { id, restaurantId: request.restaurantId },
      data: body,
    });
    if (result.count === 0) return { error: 'Table not found' };

    const updated = await fastify.prisma.restaurantTable.findUnique({ where: { id } });
    return { data: updated };
  });

  fastify.delete('/tables/:id', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await fastify.prisma.restaurantTable.deleteMany({
      where: { id, restaurantId: request.restaurantId },
    });
    return { success: true };
  });

  // ─── SERVICES CRUD ───────────────────────────────────────────────

  fastify.get('/services', { preHandler: [authenticateRestaurant] }, async (request) => {
    const services = await fastify.prisma.service.findMany({
      where: { restaurantId: request.restaurantId },
      orderBy: { startTime: 'asc' },
    });
    return { data: services };
  });

  fastify.post('/services', { preHandler: [authenticateRestaurant] }, async (request) => {
    const body = z.object({
      name: z.string().min(1),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
      slotInterval: z.number().int().refine((v) => [15, 30, 60].includes(v)),
      turnDuration: z.number().int().min(30).max(300),
      daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
      isActive: z.boolean().default(true),
    }).parse(request.body);

    const service = await fastify.prisma.service.create({
      data: { ...body, restaurantId: request.restaurantId },
    });
    return { data: service };
  });

  fastify.put('/services/:id', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = z.object({
      name: z.string().min(1).optional(),
      startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      slotInterval: z.number().int().refine((v) => [15, 30, 60].includes(v)).optional(),
      turnDuration: z.number().int().min(30).max(300).optional(),
      daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).optional(),
      isActive: z.boolean().optional(),
    }).parse(request.body);

    const result = await fastify.prisma.service.updateMany({
      where: { id, restaurantId: request.restaurantId },
      data: body,
    });
    if (result.count === 0) return { error: 'Service not found' };

    const updated = await fastify.prisma.service.findUnique({ where: { id } });
    return { data: updated };
  });

  fastify.delete('/services/:id', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await fastify.prisma.service.deleteMany({
      where: { id, restaurantId: request.restaurantId },
    });
    return { success: true };
  });

  // ─── BLOCKED DATES CRUD ──────────────────────────────────────────

  fastify.get('/blocked-dates', { preHandler: [authenticateRestaurant] }, async (request) => {
    const dates = await fastify.prisma.blockedDate.findMany({
      where: { restaurantId: request.restaurantId },
      include: { service: { select: { name: true } } },
      orderBy: { date: 'asc' },
    });
    return { data: dates };
  });

  fastify.post('/blocked-dates', { preHandler: [authenticateRestaurant] }, async (request) => {
    const body = z.object({
      date: z.string(),
      reason: z.string().optional(),
      isFullDay: z.boolean().default(true),
      serviceId: z.string().optional(),
    }).parse(request.body);

    const blocked = await fastify.prisma.blockedDate.create({
      data: {
        restaurantId: request.restaurantId,
        date: new Date(body.date + 'T00:00:00Z'),
        reason: body.reason,
        isFullDay: body.isFullDay,
        serviceId: body.serviceId,
      },
    });
    return { data: blocked };
  });

  fastify.delete('/blocked-dates/:id', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await fastify.prisma.blockedDate.deleteMany({
      where: { id, restaurantId: request.restaurantId },
    });
    return { success: true };
  });

  // ─── RESERVATIONS ────────────────────────────────────────────────

  fastify.get('/reservations', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { date, status } = z.object({
      date: z.string().optional(),
      status: z.string().optional(),
    }).parse(request.query);

    const where: any = { restaurantId: request.restaurantId };
    if (date) where.date = new Date(date + 'T00:00:00Z');
    if (status) where.status = status;

    const reservations = await fastify.prisma.reservation.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, phone: true } },
        tableAssignment: { include: { table: { include: { zone: true } } } },
      },
      orderBy: { time: 'asc' },
    });
    return { data: reservations };
  });

  fastify.patch('/reservations/:id', { preHandler: [authenticateRestaurant] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { status } = z.object({
      status: z.enum(['CONFIRMED', 'ARRIVED', 'NO_SHOW', 'CANCELLED_RESTAURANT']),
    }).parse(request.body);

    const current = await fastify.prisma.reservation.findFirst({
      where: { id, restaurantId: request.restaurantId },
    });
    if (!current) return reply.code(404).send({ message: 'Reserva no encontrada' });

    if (status === 'CONFIRMED' && current.status === 'PENDING') {
      const turnDuration = await availabilityService.getTurnDuration(
        request.restaurantId,
        current.date.toISOString().split('T')[0],
        current.time,
      );
      await availabilityService.assignTable(
        id, request.restaurantId,
        current.date.toISOString().split('T')[0],
        current.time, current.partySize, turnDuration,
        current.zoneId ?? undefined,
      );
    }

    const reservation = await fastify.prisma.reservation.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        tableAssignment: { include: { table: { include: { zone: true } } } },
      },
    });

    return { data: reservation };
  });

  // ─── TIMELINE (GANTT VIEW) ───────────────────────────────────────

  fastify.get('/timeline', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { date } = z.object({ date: z.string() }).parse(request.query);
    const entries = await availabilityService.getTimeline(request.restaurantId, date);

    const zones = await fastify.prisma.zone.findMany({
      where: { restaurantId: request.restaurantId },
      include: { tables: { where: { isActive: true }, orderBy: { label: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });

    const services = await fastify.prisma.service.findMany({
      where: { restaurantId: request.restaurantId, isActive: true },
      orderBy: { startTime: 'asc' },
    });

    return { data: { entries, zones, services } };
  });

  // ─── CALENDAR ────────────────────────────────────────────────────

  fastify.get('/calendar', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { year, month } = z.object({
      year: z.coerce.number().int(),
      month: z.coerce.number().int().min(1).max(12),
    }).parse(request.query);

    const summary = await availabilityService.getCalendarSummary(
      request.restaurantId, year, month,
    );
    return { data: summary };
  });

  // ─── STATS ───────────────────────────────────────────────────────

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

    let daily: { date: string; count: number }[] = [];
    if (from && to) {
      const dailyRaw = await fastify.prisma.reservation.groupBy({
        by: ['date'],
        where,
        _count: { id: true },
        orderBy: { date: 'asc' },
      });
      daily = dailyRaw.map((d) => ({
        date: d.date.toISOString().split('T')[0],
        count: d._count.id,
      }));
    }

    return {
      data: {
        totalReservations,
        arrived: arrivedCount,
        noShows: noShowCount,
        cancelled: cancelledCount,
        totalCoversServed: totalCovers._sum.partySize || 0,
        daily,
      },
    };
  });

  // ─── REVIEWS ─────────────────────────────────────────────────────

  fastify.get('/reviews', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { cursor, limit } = z
      .object({ cursor: z.string().optional(), limit: z.coerce.number().default(20) })
      .parse(request.query);

    const reviews = await fastify.prisma.review.findMany({
      where: { restaurantId: request.restaurantId },
      include: { user: { select: { name: true, avatar: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
    return { data: reviews };
  });

  fastify.post('/reviews/:id/reply', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { reply: replyText } = z.object({ reply: z.string().max(500) }).parse(request.body);
    const review = await reviewService.replyToReview(id, request.restaurantId, replyText);
    return { data: review };
  });

  // ─── CARTA / MENÚ ──────────────────────────────────────────────

  fastify.get('/menu', { preHandler: [authenticateRestaurant] }, async (request) => {
    const categories = await fastify.prisma.menuCategory.findMany({
      where: { restaurantId: request.restaurantId },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
    return { data: categories };
  });

  fastify.post('/menu/categories', { preHandler: [authenticateRestaurant] }, async (request) => {
    const body = z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(300).optional(),
      sortOrder: z.number().int().optional(),
    }).parse(request.body);

    const cat = await fastify.prisma.menuCategory.create({
      data: { ...body, restaurantId: request.restaurantId },
    });
    return { data: cat };
  });

  fastify.patch('/menu/categories/:id', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(300).nullable().optional(),
      sortOrder: z.number().int().optional(),
      isActive: z.boolean().optional(),
    }).parse(request.body);

    const cat = await fastify.prisma.menuCategory.update({
      where: { id, restaurantId: request.restaurantId },
      data: body,
    });
    return { data: cat };
  });

  fastify.delete('/menu/categories/:id', { preHandler: [authenticateRestaurant] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await fastify.prisma.menuCategory.delete({
      where: { id, restaurantId: request.restaurantId },
    });
    return reply.code(204).send();
  });

  fastify.post('/menu/items', { preHandler: [authenticateRestaurant] }, async (request) => {
    const body = z.object({
      categoryId: z.string(),
      name: z.string().min(1).max(150),
      description: z.string().max(500).optional(),
      price: z.number().min(0),
      image: z.string().url().optional(),
      allergens: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      isAvailable: z.boolean().optional(),
      isPopular: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }).parse(request.body);

    const item = await fastify.prisma.menuItem.create({
      data: { ...body, restaurantId: request.restaurantId },
    });
    return { data: item };
  });

  fastify.patch('/menu/items/:id', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = z.object({
      categoryId: z.string().optional(),
      name: z.string().min(1).max(150).optional(),
      description: z.string().max(500).nullable().optional(),
      price: z.number().min(0).optional(),
      image: z.string().url().nullable().optional(),
      allergens: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      isAvailable: z.boolean().optional(),
      isPopular: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }).parse(request.body);

    const item = await fastify.prisma.menuItem.update({
      where: { id, restaurantId: request.restaurantId },
      data: body,
    });
    return { data: item };
  });

  fastify.delete('/menu/items/:id', { preHandler: [authenticateRestaurant] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await fastify.prisma.menuItem.delete({
      where: { id, restaurantId: request.restaurantId },
    });
    return reply.code(204).send();
  });

  // ─── OFERTAS / DESCUENTOS ──────────────────────────────────────

  fastify.get('/offers', { preHandler: [authenticateRestaurant] }, async (request) => {
    const offers = await fastify.prisma.offer.findMany({
      where: { restaurantId: request.restaurantId },
      orderBy: { createdAt: 'desc' },
    });
    return { data: offers };
  });

  fastify.post('/offers', { preHandler: [authenticateRestaurant] }, async (request) => {
    const body = z.object({
      title: z.string().min(1).max(150),
      description: z.string().max(500).optional(),
      type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_ITEM', 'SPECIAL_MENU']),
      value: z.number().min(0),
      minCovers: z.number().int().min(1).optional(),
      daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      isActive: z.boolean().optional(),
    }).parse(request.body);

    const offer = await fastify.prisma.offer.create({
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        restaurantId: request.restaurantId,
      },
    });
    return { data: offer };
  });

  fastify.patch('/offers/:id', { preHandler: [authenticateRestaurant] }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = z.object({
      title: z.string().min(1).max(150).optional(),
      description: z.string().max(500).nullable().optional(),
      type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_ITEM', 'SPECIAL_MENU']).optional(),
      value: z.number().min(0).optional(),
      minCovers: z.number().int().min(1).optional(),
      daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
      startDate: z.string().nullable().optional(),
      endDate: z.string().nullable().optional(),
      startTime: z.string().nullable().optional(),
      endTime: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    }).parse(request.body);

    const offer = await fastify.prisma.offer.update({
      where: { id, restaurantId: request.restaurantId },
      data: {
        ...body,
        startDate: body.startDate !== undefined ? (body.startDate ? new Date(body.startDate) : null) : undefined,
        endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : undefined,
      },
    });
    return { data: offer };
  });

  fastify.delete('/offers/:id', { preHandler: [authenticateRestaurant] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await fastify.prisma.offer.delete({
      where: { id, restaurantId: request.restaurantId },
    });
    return reply.code(204).send();
  });
};
