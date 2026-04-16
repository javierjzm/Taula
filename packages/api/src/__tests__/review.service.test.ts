import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReviewService } from '../services/review.service';

const mockReview = {
  id: 'rev-1',
  userId: 'user-1',
  restaurantId: 'rest-1',
  rating: 4.5,
  comment: 'Excellent food!',
  ownerReply: null,
  isVisible: true,
  createdAt: new Date(),
  user: { name: 'Test User', avatar: null },
};

describe('ReviewService', () => {
  let service: ReviewService;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      review: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        aggregate: vi.fn(),
      },
      restaurant: {
        update: vi.fn(),
      },
    };

    service = new ReviewService(mockPrisma);
  });

  describe('create', () => {
    it('should create a review and recalculate rating', async () => {
      mockPrisma.review.findFirst.mockResolvedValue(null);
      mockPrisma.review.create.mockResolvedValue(mockReview);
      mockPrisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: 1,
      });

      const result = await service.create('user-1', {
        restaurantId: 'rest-1',
        rating: 4.5,
        comment: 'Excellent food!',
      });

      expect(result).toBeDefined();
      expect(result.rating).toBe(4.5);
      expect(mockPrisma.restaurant.update).toHaveBeenCalledWith({
        where: { id: 'rest-1' },
        data: { avgRating: 4.5, reviewCount: 1 },
      });
    });

    it('should throw 409 if user already reviewed the restaurant', async () => {
      mockPrisma.review.findFirst.mockResolvedValue(mockReview);

      await expect(
        service.create('user-1', {
          restaurantId: 'rest-1',
          rating: 5,
          comment: 'Again!',
        }),
      ).rejects.toThrow('Ya has dejado una reseña en este restaurante');
    });
  });

  describe('findByRestaurant', () => {
    it('should return visible reviews for a restaurant', async () => {
      mockPrisma.review.findMany.mockResolvedValue([mockReview]);

      const result = await service.findByRestaurant('rest-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { restaurantId: 'rest-1', isVisible: true },
        }),
      );
    });
  });

  describe('replyToReview', () => {
    it('should add an owner reply to a review', async () => {
      mockPrisma.review.findFirst.mockResolvedValue(mockReview);
      mockPrisma.review.update.mockResolvedValue({
        ...mockReview,
        ownerReply: 'Thank you!',
      });

      const result = await service.replyToReview('rev-1', 'rest-1', 'Thank you!');

      expect(result.ownerReply).toBe('Thank you!');
    });

    it('should throw 404 if review not found', async () => {
      mockPrisma.review.findFirst.mockResolvedValue(null);

      await expect(
        service.replyToReview('nonexistent', 'rest-1', 'Reply'),
      ).rejects.toThrow('Reseña no encontrada');
    });
  });
});
