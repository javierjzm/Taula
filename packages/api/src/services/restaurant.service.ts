import { PrismaClient, Prisma } from '@prisma/client';

export interface RestaurantFilters {
  q?: string;
  lat?: number;
  lon?: number;
  radius?: number;
  parish?: string;
  cuisine?: string;
  priceRange?: number[];
  minRating?: number;
  openNow?: boolean;
  featured?: boolean;
  limit?: number;
  cursor?: string;
}

export class RestaurantService {
  constructor(private prisma: PrismaClient) {}

  async findMany(filters: RestaurantFilters) {
    const where: Prisma.RestaurantWhereInput = {
      isActive: true,
      ...(filters.q && {
        OR: [
          { name: { contains: filters.q, mode: 'insensitive' } },
          { description: { contains: filters.q, mode: 'insensitive' } },
          { address: { contains: filters.q, mode: 'insensitive' } },
          { cuisineType: { has: filters.q.toLowerCase() } },
        ],
      }),
      ...(filters.parish && { parish: filters.parish as any }),
      ...(filters.priceRange?.length && { priceRange: { in: filters.priceRange } }),
      ...(filters.minRating && { avgRating: { gte: filters.minRating } }),
      ...(filters.featured !== undefined && { isFeatured: filters.featured }),
      ...(filters.cuisine && { cuisineType: { has: filters.cuisine } }),
    };

    const restaurants = await this.prisma.restaurant.findMany({
      where,
      include: { hours: true },
      orderBy: [
        { isFeatured: 'desc' },
        { avgRating: 'desc' },
      ],
      take: filters.limit || 20,
      ...(filters.cursor && { cursor: { id: filters.cursor }, skip: 1 }),
    });

    const now = new Date();

    return restaurants
      .map((r) => {
        const distanceMeters =
          filters.lat && filters.lon
            ? this.calculateDistance(filters.lat, filters.lon, r.latitude, r.longitude)
            : null;

        return {
          id: r.id,
          name: r.name,
          slug: r.slug,
          description: r.description,
          cuisineType: r.cuisineType,
          cuisine: r.cuisineType.join(', '),
          priceRange: r.priceRange,
          phone: r.phone,
          email: r.email,
          website: r.website,
          address: r.address,
          parish: r.parish.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()),
          latitude: r.latitude,
          longitude: r.longitude,
          isActive: r.isActive,
          isFeatured: r.isFeatured,
          coverImage: r.coverImage,
          images: r.images,
          avgRating: r.avgRating,
          reviewCount: r.reviewCount,
          distanceMeters,
          distance: distanceMeters != null ? Math.round((distanceMeters / 1000) * 10) / 10 : null,
          isOpen: this.checkIsOpen(r.hours, now),
        };
      })
      .filter((r) => {
        if (r.distanceMeters == null) return true;
        const radiusMeters = filters.radius ?? 50000;
        return r.distanceMeters <= radiusMeters;
      })
      .sort((a, b) => {
        if (a.distanceMeters != null && b.distanceMeters != null) {
          return a.distanceMeters - b.distanceMeters;
        }
        return 0;
      });
  }

  async findBySlug(slug: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { slug, isActive: true },
      include: { hours: true },
    });
    if (!restaurant) return null;

    const now = new Date();
    return {
      ...restaurant,
      parish: restaurant.parish.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()),
      cuisine: restaurant.cuisineType.join(', '),
      isOpen: this.checkIsOpen(restaurant.hours, now),
    };
  }

  async getAvailableSlots(restaurantId: string, date: string, partySize: number) {
    const targetDate = new Date(date);

    const slots = await this.prisma.availabilitySlot.findMany({
      where: {
        restaurantId,
        date: targetDate,
        isBlocked: false,
      },
      orderBy: { time: 'asc' },
    });

    return slots
      .filter((slot) => slot.maxCovers - slot.bookedCovers >= partySize)
      .map((slot) => ({
        id: slot.id,
        time: slot.time,
        availableCovers: slot.maxCovers - slot.bookedCovers,
      }));
  }

  private checkIsOpen(
    hours: { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }[],
    now: Date,
  ): boolean {
    const day = now.getDay();
    const todayHours = hours.find((h) => h.dayOfWeek === day);
    if (!todayHours || todayHours.isClosed) return false;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = todayHours.openTime.split(':').map(Number);
    const [closeH, closeM] = todayHours.closeTime.split(':').map(Number);
    const openMinutes = openH * 60 + openM;
    let closeMinutes = closeH * 60 + closeM;

    if (closeMinutes <= openMinutes) closeMinutes += 24 * 60;

    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
