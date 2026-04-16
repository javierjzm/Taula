import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors';
import { generateReservationCode } from '../utils/reservationCode';
import { emailQueue, pushQueue } from '../jobs/queue';

export class ReservationService {
  constructor(private prisma: PrismaClient) {}

  async create(userId: string, input: {
    restaurantId: string;
    slotId: string;
    date: string;
    time: string;
    partySize: number;
    specialRequests?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const slot = await tx.$queryRaw<[{ id: string; max_covers: number; booked_covers: number; is_blocked: boolean }]>`
        SELECT id, max_covers, booked_covers, is_blocked
        FROM availability_slots
        WHERE id = ${input.slotId} AND restaurant_id = ${input.restaurantId}
        FOR UPDATE
      `;

      if (!slot[0]) throw new AppError(404, 'Slot no encontrado');
      if (slot[0].is_blocked) throw new AppError(409, 'Este horario no está disponible');

      const available = slot[0].max_covers - slot[0].booked_covers;
      if (available < input.partySize) {
        throw new AppError(409, `Solo quedan ${available} plazas disponibles en este horario`);
      }

      const reservation = await tx.reservation.create({
        data: {
          code: generateReservationCode(),
          userId,
          restaurantId: input.restaurantId,
          slotId: input.slotId,
          date: new Date(input.date),
          time: input.time,
          partySize: input.partySize,
          specialRequests: input.specialRequests,
          status: 'CONFIRMED',
        },
        include: {
          restaurant: { select: { name: true, address: true, coverImage: true } },
          user: { select: { name: true, email: true, pushToken: true } },
        },
      });

      await tx.availabilitySlot.update({
        where: { id: input.slotId },
        data: { bookedCovers: { increment: input.partySize } },
      });

      await tx.billingRecord.create({
        data: {
          restaurantId: input.restaurantId,
          reservationId: reservation.id,
          amount: input.partySize * 1.8,
          covers: input.partySize,
          status: 'PENDING',
        },
      });

      await emailQueue.add('reservation-confirmation', {
        type: 'RESERVATION_CONFIRMED',
        reservationId: reservation.id,
        userEmail: reservation.user.email,
        userName: reservation.user.name,
        restaurantName: reservation.restaurant.name,
        date: input.date,
        time: input.time,
        partySize: input.partySize,
        code: reservation.code,
      });

      if (reservation.user.pushToken) {
        await pushQueue.add('reservation-confirmation-push', {
          pushToken: reservation.user.pushToken,
          title: 'Reserva confirmada!',
          body: `${reservation.restaurant.name} - ${input.date} a las ${input.time}`,
          data: { reservationId: reservation.id },
        });
      }

      return reservation;
    });
  }

  async cancelByUser(userId: string, reservationId: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, userId },
    });
    if (!reservation) throw new AppError(404, 'Reserva no encontrada');
    if (reservation.status !== 'CONFIRMED') {
      throw new AppError(409, 'Esta reserva ya no puede cancelarse');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: 'CANCELLED_USER' },
      });

      await tx.availabilitySlot.update({
        where: { id: reservation.slotId },
        data: { bookedCovers: { decrement: reservation.partySize } },
      });

      await tx.billingRecord.updateMany({
        where: { reservationId },
        data: { status: 'PENDING' },
      });
    });
  }

  async getUserReservations(userId: string) {
    return this.prisma.reservation.findMany({
      where: { userId },
      include: {
        restaurant: {
          select: { name: true, address: true, coverImage: true, slug: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async getById(reservationId: string) {
    return this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        restaurant: {
          select: { name: true, address: true, coverImage: true, slug: true },
        },
      },
    });
  }
}
