import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlotService } from '../services/slot.service';

const mockRestaurant = {
  id: 'rest-1',
  name: 'Test Restaurant',
  hours: [
    { dayOfWeek: 1, openTime: '12:00', closeTime: '14:00', isClosed: false },
    { dayOfWeek: 2, openTime: '12:00', closeTime: '14:00', isClosed: false },
    { dayOfWeek: 0, openTime: '12:00', closeTime: '14:00', isClosed: true },
  ],
};

describe('SlotService', () => {
  let service: SlotService;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      restaurant: {
        findUnique: vi.fn(),
      },
      availabilitySlot: {
        upsert: vi.fn().mockResolvedValue({}),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn((ops: any[]) => Promise.all(ops)),
    };

    service = new SlotService(mockPrisma);
  });

  describe('generateSlotsForRestaurant', () => {
    it('should generate slots for open days', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(mockRestaurant);

      const count = await service.generateSlotsForRestaurant('rest-1', 7);

      expect(count).toBeGreaterThan(0);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw 404 if restaurant not found', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(null);

      await expect(
        service.generateSlotsForRestaurant('nonexistent'),
      ).rejects.toThrow('Restaurante no encontrado');
    });

    it('should skip closed days', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(mockRestaurant);

      const count = await service.generateSlotsForRestaurant('rest-1', 7);

      const transactionArgs = mockPrisma.$transaction.mock.calls[0][0];
      expect(count).toBeGreaterThan(0);
      expect(transactionArgs.length).toBe(count);
    });
  });

  describe('blockSlot', () => {
    it('should block an existing slot', async () => {
      mockPrisma.availabilitySlot.findFirst.mockResolvedValue({
        id: 'slot-1',
        restaurantId: 'rest-1',
      });
      mockPrisma.availabilitySlot.update.mockResolvedValue({
        id: 'slot-1',
        isBlocked: true,
      });

      const result = await service.blockSlot('rest-1', 'slot-1');

      expect(result.isBlocked).toBe(true);
    });

    it('should throw 404 if slot not found', async () => {
      mockPrisma.availabilitySlot.findFirst.mockResolvedValue(null);

      await expect(
        service.blockSlot('rest-1', 'nonexistent'),
      ).rejects.toThrow('Slot no encontrado');
    });
  });

  describe('unblockSlot', () => {
    it('should unblock an existing slot', async () => {
      mockPrisma.availabilitySlot.findFirst.mockResolvedValue({
        id: 'slot-1',
        restaurantId: 'rest-1',
      });
      mockPrisma.availabilitySlot.update.mockResolvedValue({
        id: 'slot-1',
        isBlocked: false,
      });

      const result = await service.unblockSlot('rest-1', 'slot-1');

      expect(result.isBlocked).toBe(false);
    });
  });
});
