import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReservationService } from '../services/reservation.service';

vi.mock('../jobs/queue', () => ({
  emailQueue: { add: vi.fn() },
  pushQueue: { add: vi.fn() },
}));

const mockSlot = {
  id: 'slot-1',
  maxCovers: 20,
  bookedCovers: 5,
  isBlocked: false,
};

const mockReservation = {
  id: 'res-1',
  code: 'TAU-XXXX',
  userId: 'user-1',
  restaurantId: 'rest-1',
  slotId: 'slot-1',
  date: new Date('2025-06-15'),
  time: '20:00',
  partySize: 4,
  specialRequests: null,
  status: 'CONFIRMED',
  createdAt: new Date('2025-06-10T10:00:00Z'),
  restaurant: { name: 'Test Restaurant', address: 'Test Address', coverImage: null, slug: 'test-restaurant' },
  user: { name: 'Test User', email: 'test@taula.ad', pushToken: null },
};

describe('ReservationService', () => {
  let service: ReservationService;
  let mockTx: any;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTx = {
      $queryRaw: vi.fn(),
      reservation: {
        create: vi.fn(),
        update: vi.fn(),
      },
      availabilitySlot: {
        update: vi.fn(),
      },
      billingRecord: {
        create: vi.fn(),
        updateMany: vi.fn(),
      },
    };

    mockPrisma = {
      $transaction: vi.fn((fn: Function) => fn(mockTx)),
      reservation: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
    };

    service = new ReservationService(mockPrisma);
  });

  describe('create', () => {
    it('should create a reservation and return a DTO', async () => {
      mockTx.$queryRaw.mockResolvedValue([mockSlot]);
      mockTx.reservation.create.mockResolvedValue(mockReservation);

      const result = await service.create('user-1', {
        restaurantId: 'rest-1',
        slotId: 'slot-1',
        date: '2025-06-15',
        time: '20:00',
        partySize: 4,
      });

      expect(result).toBeDefined();
      expect(result.restaurantName).toBe('Test Restaurant');
      expect(result.restaurantAddress).toBe('Test Address');
      expect(result.date).toBe('2025-06-15');
      expect(mockTx.reservation.create).toHaveBeenCalledOnce();
      expect(mockTx.availabilitySlot.update).toHaveBeenCalledOnce();
      expect(mockTx.billingRecord.create).toHaveBeenCalledOnce();
    });

    it('should throw 404 when slot not found', async () => {
      mockTx.$queryRaw.mockResolvedValue([]);

      await expect(
        service.create('user-1', {
          restaurantId: 'rest-1',
          slotId: 'nonexistent',
          date: '2025-06-15',
          time: '20:00',
          partySize: 4,
        }),
      ).rejects.toThrow('Slot no encontrado');
    });

    it('should throw 409 when slot is blocked', async () => {
      mockTx.$queryRaw.mockResolvedValue([{ ...mockSlot, isBlocked: true }]);

      await expect(
        service.create('user-1', {
          restaurantId: 'rest-1',
          slotId: 'slot-1',
          date: '2025-06-15',
          time: '20:00',
          partySize: 4,
        }),
      ).rejects.toThrow('Este horario no está disponible');
    });

    it('should throw 409 when not enough capacity', async () => {
      mockTx.$queryRaw.mockResolvedValue([{ ...mockSlot, bookedCovers: 18 }]);

      await expect(
        service.create('user-1', {
          restaurantId: 'rest-1',
          slotId: 'slot-1',
          date: '2025-06-15',
          time: '20:00',
          partySize: 4,
        }),
      ).rejects.toThrow('Solo quedan');
    });
  });

  describe('cancelByUser', () => {
    it('should cancel a confirmed reservation and return DTO', async () => {
      mockPrisma.reservation.findFirst.mockResolvedValue({
        ...mockReservation,
        status: 'CONFIRMED',
      });

      const result = await service.cancelByUser('user-1', 'res-1');

      expect(result.status).toBe('CANCELLED_USER');
      expect(result.restaurantName).toBe('Test Restaurant');
      expect(mockTx.reservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { status: 'CANCELLED_USER' },
      });
    });

    it('should throw 404 if reservation not found', async () => {
      mockPrisma.reservation.findFirst.mockResolvedValue(null);

      await expect(service.cancelByUser('user-1', 'nonexistent')).rejects.toThrow(
        'Reserva no encontrada',
      );
    });

    it('should throw 409 if reservation is not CONFIRMED', async () => {
      mockPrisma.reservation.findFirst.mockResolvedValue({
        ...mockReservation,
        status: 'ARRIVED',
      });

      await expect(service.cancelByUser('user-1', 'res-1')).rejects.toThrow(
        'Esta reserva ya no puede cancelarse',
      );
    });
  });

  describe('getUserReservations', () => {
    it('should return user reservations as DTOs', async () => {
      mockPrisma.reservation.findMany.mockResolvedValue([mockReservation]);

      const result = await service.getUserReservations('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].restaurantName).toBe('Test Restaurant');
      expect(result[0].date).toBe('2025-06-15');
      expect(mockPrisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });

  describe('getById', () => {
    it('should return reservation DTO for the correct user', async () => {
      mockPrisma.reservation.findFirst.mockResolvedValue(mockReservation);

      const result = await service.getById('user-1', 'res-1');

      expect(result).toBeDefined();
      expect(result!.restaurantName).toBe('Test Restaurant');
      expect(mockPrisma.reservation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'res-1', userId: 'user-1' } }),
      );
    });

    it('should return null if reservation not found or wrong user', async () => {
      mockPrisma.reservation.findFirst.mockResolvedValue(null);

      const result = await service.getById('other-user', 'res-1');
      expect(result).toBeNull();
    });
  });
});
