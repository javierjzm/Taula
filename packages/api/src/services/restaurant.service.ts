import { PrismaClient, Prisma } from '@prisma/client';

export interface RestaurantFilters {
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

    if (filters.lat && filters.lon) {
      return restaurants
        .map((r) => ({
          ...r,
          distanceMeters: this.calculateDistance(
            filters.lat!,
            filters.lon!,
            r.latitude,
            r.longitude,
          ),
        }))
        .sort((a, b) => a.distanceMeters - b.distanceMeters);
    }

    return restaurants;
  }

  async findBySlug(slug: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug, isActive: true },
      include: { hours: true },
    });
    if (!restaurant) return null;
    return restaurant;
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
