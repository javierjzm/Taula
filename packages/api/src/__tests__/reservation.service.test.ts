import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReservationService } from '../services/reservation.service';

vi.mock('../jobs/queue', () => ({
  emailQueue: { add: vi.fn() },
  pushQueue: { add: vi.fn() },
}));

const mockSlot = {
  id: 'slot-1',
  max_covers: 20,
  booked_covers: 5,
  is_blocked: false,
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
  restaurant: { name: 'Test Restaurant', address: 'Test Address', coverImage: null },
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
    it('should create a reservation successfully', async () => {
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
      mockTx.$queryRaw.mockResolvedValue([{ ...mockSlot, is_blocked: true }]);

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
      mockTx.$queryRaw.mockResolvedValue([{ ...mockSlot, booked_covers: 18 }]);

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
    it('should cancel a confirmed reservation', async () => {
      mockPrisma.reservation.findFirst.mockResolvedValue({
        id: 'res-1',
        userId: 'user-1',
        slotId: 'slot-1',
        partySize: 4,
        status: 'CONFIRMED',
      });

      await service.cancelByUser('user-1', 'res-1');

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
        id: 'res-1',
        userId: 'user-1',
        status: 'ARRIVED',
      });

      await expect(service.cancelByUser('user-1', 'res-1')).rejects.toThrow(
        'Esta reserva ya no puede cancelarse',
      );
    });
  });

  describe('getUserReservations', () => {
    it('should return user reservations', async () => {
      mockPrisma.reservation.findMany.mockResolvedValue([mockReservation]);

      const result = await service.getUserReservations('user-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });
});
