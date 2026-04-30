import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReservationService } from '../services/reservation.service';
import { AvailabilityService } from '../services/availability.service';

vi.mock('../jobs/queue', () => ({
  emailQueue: { add: vi.fn() },
  pushQueue: { add: vi.fn() },
}));

const mockReservation = {
  id: 'res-1',
  code: 'TAU-XXXX',
  userId: 'user-1',
  restaurantId: 'rest-1',
  slotId: 'slot-1',
  date: new Date('2099-06-15'),
  time: '20:00',
  partySize: 4,
  specialRequests: null,
  status: 'CONFIRMED',
  createdAt: new Date('2025-06-10T10:00:00Z'),
  restaurant: { name: 'Test Restaurant', address: 'Test Address', coverImage: null, slug: 'test-restaurant' },
  user: { name: 'Test User', email: 'test@taula.ad', pushToken: null },
};

const mockRestaurant = {
  requiresApproval: false,
  name: 'Test Restaurant',
  minAdvanceMinutes: 0,
  maxAdvanceDays: 36500,
  email: 'restaurant@taula.ad',
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
      tableAssignment: {
        deleteMany: vi.fn(),
      },
      billingRecord: {
        create: vi.fn(),
        updateMany: vi.fn(),
      },
    };

    mockPrisma = {
      $transaction: vi.fn((fn: Function) => fn(mockTx)),
      reservation: {
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      restaurant: {
        findUnique: vi.fn(),
      },
      subscription: {
        findUnique: vi.fn(),
      },
      billingRecord: {
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      tableAssignment: {
        deleteMany: vi.fn(),
      },
      notification: {
        create: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      notificationPreference: {
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      restaurantOwner: {
        findMany: vi.fn(),
      },
    };

    vi.spyOn(AvailabilityService.prototype, 'checkBlocked').mockResolvedValue(false);
    vi.spyOn(AvailabilityService.prototype, 'getAvailableSlots').mockResolvedValue([
      { time: '20:00', serviceName: 'Cena', availableTables: 2 },
    ]);
    vi.spyOn(AvailabilityService.prototype, 'getTurnDuration').mockResolvedValue(120);
    vi.spyOn(AvailabilityService.prototype, 'assignTable').mockResolvedValue({
      tableId: 'table-1',
      tableLabel: 'T1',
      zoneName: 'Sala',
    });

    service = new ReservationService(mockPrisma);
  });

  describe('create', () => {
    it('should create a reservation and return a DTO', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(mockRestaurant);
      mockPrisma.reservation.findFirst.mockResolvedValue(null);
      mockPrisma.reservation.create.mockResolvedValue(mockReservation);
      mockPrisma.subscription.findUnique.mockResolvedValue({ plan: 'RESERVATIONS', status: 'ACTIVE' });
      mockPrisma.billingRecord.create.mockResolvedValue({});
      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ pushToken: null, name: 'Test User' });
      mockPrisma.restaurantOwner.findMany.mockResolvedValue([]);
      mockPrisma.reservation.findUnique.mockResolvedValue(mockReservation);

      const result = await service.create('user-1', {
        restaurantId: 'rest-1',
        date: '2099-06-15',
        time: '20:00',
        partySize: 4,
      });

      expect(result).toBeDefined();
      expect(result.restaurantName).toBe('Test Restaurant');
      expect(result.restaurantAddress).toBe('Test Address');
      expect(result.date).toBe('2099-06-15');
      expect(mockPrisma.reservation.create).toHaveBeenCalledOnce();
      expect(mockPrisma.billingRecord.create).toHaveBeenCalledOnce();
    });

    it('should throw 409 when no slot is available', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(mockRestaurant);
      mockPrisma.reservation.findFirst.mockResolvedValue(null);
      vi.spyOn(AvailabilityService.prototype, 'getAvailableSlots').mockResolvedValue([]);

      await expect(
        service.create('user-1', {
          restaurantId: 'rest-1',
          date: '2099-06-15',
          time: '20:00',
          partySize: 4,
        }),
      ).rejects.toThrow('No hay disponibilidad');
    });

    it('should throw 409 when restaurant is blocked', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(mockRestaurant);
      mockPrisma.reservation.findFirst.mockResolvedValue(null);
      vi.spyOn(AvailabilityService.prototype, 'checkBlocked').mockResolvedValue(true);

      await expect(
        service.create('user-1', {
          restaurantId: 'rest-1',
          date: '2099-06-15',
          time: '20:00',
          partySize: 4,
        }),
      ).rejects.toThrow('no acepta reservas');
    });

    it('should throw 409 when duplicate active reservation exists', async () => {
      mockPrisma.restaurant.findUnique.mockResolvedValue(mockRestaurant);
      mockPrisma.reservation.findFirst.mockResolvedValue(mockReservation);

      await expect(
        service.create('user-1', {
          restaurantId: 'rest-1',
          date: '2099-06-15',
          time: '20:00',
          partySize: 4,
        }),
      ).rejects.toThrow('Ya tienes una reserva activa');
    });
  });

  describe('cancelByUser', () => {
    it('should cancel a confirmed reservation and return DTO', async () => {
      mockPrisma.reservation.findFirst.mockResolvedValue({
        ...mockReservation,
        status: 'CONFIRMED',
      });
      mockTx.reservation.update.mockResolvedValue({});
      mockTx.tableAssignment.deleteMany.mockResolvedValue({});
      mockTx.billingRecord.updateMany.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Test User' });
      mockPrisma.restaurant.findUnique.mockResolvedValue({ email: null, name: 'Test Restaurant' });
      mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });
      mockPrisma.restaurantOwner.findMany.mockResolvedValue([]);

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
      expect(result[0].date).toBe('2099-06-15');
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
