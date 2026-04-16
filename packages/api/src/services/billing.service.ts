import { PrismaClient } from '@prisma/client';

export class BillingService {
  constructor(private prisma: PrismaClient) {}

  async getRestaurantBilling(restaurantId: string, from?: string, to?: string) {
    return this.prisma.billingRecord.findMany({
      where: {
        restaurantId,
        ...(from && to && {
          createdAt: {
            gte: new Date(from),
            lte: new Date(to),
          },
        }),
      },
      include: {
        reservation: {
          select: { code: true, date: true, time: true, partySize: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
