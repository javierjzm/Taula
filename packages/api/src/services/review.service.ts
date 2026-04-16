import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors';

export class ReviewService {
  constructor(private prisma: PrismaClient) {}

  async create(userId: string, input: {
    restaurantId: string;
    rating: number;
    comment?: string;
  }) {
    const existing = await this.prisma.review.findFirst({
      where: { userId, restaurantId: input.restaurantId },
    });
    if (existing) throw new AppError(409, 'Ya has dejado una reseña en este restaurante');

    const review = await this.prisma.review.create({
      data: { userId, ...input },
      include: { user: { select: { name: true, avatar: true } } },
    });

    await this.recalculateRating(input.restaurantId);

    return review;
  }

  async findByRestaurant(restaurantId: string, cursor?: string, limit = 10) {
    return this.prisma.review.findMany({
      where: { restaurantId, isVisible: true },
      include: { user: { select: { name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
  }

  async replyToReview(reviewId: string, restaurantId: string, reply: string) {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, restaurantId },
    });
    if (!review) throw new AppError(404, 'Reseña no encontrada');

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { ownerReply: reply },
    });
  }

  private async recalculateRating(restaurantId: string) {
    const result = await this.prisma.review.aggregate({
      where: { restaurantId, isVisible: true },
      _avg: { rating: true },
      _count: true,
    });

    await this.prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        avgRating: result._avg.rating || 0,
        reviewCount: result._count,
      },
    });
  }
}
