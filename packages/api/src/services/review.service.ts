import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors';
import { NotificationService } from './notification.service';

export class ReviewService {
  private notificationService: NotificationService;

  constructor(private prisma: PrismaClient) {
    this.notificationService = new NotificationService(prisma);
  }

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

    await this.notificationService
      .notifyRestaurant(input.restaurantId, {
        title: 'Nueva reseña',
        body: `${review.user.name} dejó una reseña de ${input.rating} estrellas.`,
        type: 'review_new',
        data: { reviewId: review.id, deepLink: '/(restaurant)/reviews' },
        preferenceKey: 'newReview',
      })
      .catch(() => {});

    return review;
  }

  async replyAndNotifyUser(reviewId: string, restaurantId: string, reply: string) {
    const updated = await this.replyToReview(reviewId, restaurantId, reply);
    if (updated) {
      const full = await this.prisma.review.findUnique({
        where: { id: reviewId },
        include: { restaurant: { select: { name: true, slug: true } } },
      });
      if (full) {
        await this.notificationService
          .notifyUser(full.userId, {
            title: `${full.restaurant.name} respondió a tu reseña`,
            body: reply.slice(0, 140),
            type: 'review_reply',
            data: {
              reviewId,
              restaurantId,
              slug: full.restaurant.slug,
              deepLink: `/restaurant/${full.restaurant.slug}`,
            },
          })
          .catch(() => {});
      }
    }
    return updated;
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
