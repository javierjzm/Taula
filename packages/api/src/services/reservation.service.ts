import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors';
import { generateReservationCode } from '../utils/reservationCode';
import { emailQueue, pushQueue } from '../jobs/queue';
import { AvailabilityService } from './availability.service';

function toDTO(r: any) {
  return {
    id: r.id,
    code: r.code,
    restaurantId: r.restaurantId,
    restaurantName: r.restaurant?.name ?? '',
    restaurantCover: r.restaurant?.coverImage ?? null,
    restaurantAddress: r.restaurant?.address ?? '',
    restaurantSlug: r.restaurant?.slug ?? '',
    date: typeof r.date === 'string' ? r.date : r.date?.toISOString?.().split('T')[0] ?? '',
    time: r.time,
    partySize: r.partySize,
    zoneId: r.zoneId ?? null,
    zoneName: r.tableAssignment?.table?.zone?.name ?? null,
    tableName: r.tableAssignment?.table?.label ?? null,
    specialRequests: r.specialRequests ?? null,
    status: r.status,
    cardGuarantee: r.cardGuarantee ?? false,
    noShowCharged: r.noShowCharged ?? false,
    noShowAmount: r.noShowAmount ?? null,
    createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
  };
}

const RESERVATION_INCLUDE = {
  restaurant: {
    select: { name: true, address: true, coverImage: true, slug: true, requiresApproval: true },
  },
  tableAssignment: {
    include: { table: { include: { zone: true } } },
  },
} as const;

export class ReservationService {
  private availabilityService: AvailabilityService;

  constructor(private prisma: PrismaClient) {
    this.availabilityService = new AvailabilityService(prisma);
  }

  async create(userId: string, input: {
    restaurantId: string;
    date: string;
    time: string;
    partySize: number;
    zoneId?: string;
    specialRequests?: string;
  }) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: input.restaurantId },
      select: { requiresApproval: true, name: true, minAdvanceMinutes: true, maxAdvanceDays: true, email: true },
    });
    if (!restaurant) throw new AppError(404, 'Restaurante no encontrado');

    // --- Validate advance time and max days ---
    const now = new Date();
    const [rH, rM] = input.time.split(':').map(Number);
    const reservationDateTime = new Date(input.date + 'T00:00:00Z');
    reservationDateTime.setUTCHours(rH, rM, 0, 0);

    const minAdvance = restaurant.minAdvanceMinutes ?? 0;
    if (minAdvance > 0) {
      const minTime = new Date(now.getTime() + minAdvance * 60_000);
      if (reservationDateTime < minTime) {
        throw new AppError(409, `Se requiere al menos ${minAdvance} minutos de antelación`);
      }
    }

    const maxDays = restaurant.maxAdvanceDays ?? 60;
    const maxDate = new Date(now.getTime() + maxDays * 24 * 3600_000);
    if (reservationDateTime > maxDate) {
      throw new AppError(409, `No se puede reservar con más de ${maxDays} días de antelación`);
    }

    if (reservationDateTime < now) {
      throw new AppError(409, 'No se puede reservar en una fecha/hora pasada');
    }

    // --- Check for duplicate active reservation by same user ---
    const existingActive = await this.prisma.reservation.findFirst({
      where: {
        userId,
        restaurantId: input.restaurantId,
        date: new Date(input.date + 'T00:00:00Z'),
        time: input.time,
        status: { in: ['CONFIRMED', 'PENDING', 'ARRIVED'] },
      },
    });
    if (existingActive) {
      throw new AppError(409, 'Ya tienes una reserva activa en este restaurante para esta fecha y hora');
    }

    const isBlocked = await this.availabilityService.checkBlocked(input.restaurantId, input.date);
    if (isBlocked) throw new AppError(409, 'El restaurante no acepta reservas en esta fecha');

    // --- Check slot availability (inside transaction to prevent race condition) ---
    const slots = await this.availabilityService.getAvailableSlots(
      input.restaurantId, input.date, input.partySize, input.zoneId,
    );
    const slotExists = slots.some((s) => s.time === input.time);
    if (!slotExists) {
      throw new AppError(409, 'No hay disponibilidad para este horario y número de personas');
    }

    const status = restaurant.requiresApproval ? 'PENDING' : 'CONFIRMED';
    const turnDuration = await this.availabilityService.getTurnDuration(
      input.restaurantId, input.date, input.time,
    );

    const reservation = await this.prisma.reservation.create({
      data: {
        code: generateReservationCode(),
        userId,
        restaurantId: input.restaurantId,
        date: new Date(input.date + 'T00:00:00Z'),
        time: input.time,
        partySize: input.partySize,
        zoneId: input.zoneId,
        specialRequests: input.specialRequests,
        status,
      },
      include: {
        restaurant: { select: { name: true, address: true, coverImage: true, slug: true } },
        user: { select: { name: true, email: true, pushToken: true } },
      },
    });

    if (status === 'CONFIRMED') {
      const assigned = await this.availabilityService.assignTable(
        reservation.id, input.restaurantId,
        input.date, input.time, input.partySize, turnDuration,
        input.zoneId,
      );
      if (!assigned) {
        await this.prisma.reservation.delete({ where: { id: reservation.id } });
        throw new AppError(409, 'No hay mesas disponibles para este horario');
      }
    }

    await this.prisma.billingRecord.create({
      data: {
        restaurantId: input.restaurantId,
        reservationId: reservation.id,
        amount: input.partySize * 1.8,
        covers: input.partySize,
        status: 'PENDING',
      },
    });

    await this.prisma.notification.create({
      data: {
        userId,
        title: status === 'CONFIRMED' ? 'Reserva confirmada' : 'Reserva pendiente',
        body: `${reservation.restaurant.name} · ${input.date} a las ${input.time} · ${input.partySize} pers.`,
        type: 'reservation',
        data: { reservationId: reservation.id },
      },
    }).catch(() => {});

    try {
      await emailQueue.add('reservation-confirmation', {
        type: status === 'CONFIRMED' ? 'RESERVATION_CONFIRMED' : 'RESERVATION_PENDING',
        reservationId: reservation.id,
        userEmail: reservation.user.email,
        userName: reservation.user.name,
        restaurantName: reservation.restaurant.name,
        date: input.date,
        time: input.time,
        partySize: input.partySize,
        code: reservation.code,
      });
    } catch { /* queue may not be running in dev */ }

    if (reservation.user.pushToken) {
      try {
        await pushQueue.add('reservation-push', {
          pushToken: reservation.user.pushToken,
          title: status === 'CONFIRMED' ? 'Reserva confirmada!' : 'Reserva pendiente',
          body: `${reservation.restaurant.name} - ${input.date} a las ${input.time}`,
          data: { reservationId: reservation.id },
        });
      } catch { /* queue may not be running in dev */ }
    }

    if (restaurant.email) {
      try {
        await emailQueue.add('restaurant-new-reservation', {
          type: 'RESTAURANT_NEW_RESERVATION',
          restaurantEmail: restaurant.email,
          restaurantName: restaurant.name,
          userName: reservation.user.name,
          date: input.date,
          time: input.time,
          partySize: input.partySize,
          code: reservation.code,
          requiresApproval: restaurant.requiresApproval,
        });
      } catch { /* queue may not be running */ }
    }

    const full = await this.prisma.reservation.findUnique({
      where: { id: reservation.id },
      include: RESERVATION_INCLUDE,
    });
    return toDTO(full);
  }

  async cancelByUser(userId: string, reservationId: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, userId },
      include: RESERVATION_INCLUDE,
    });
    if (!reservation) throw new AppError(404, 'Reserva no encontrada');
    if (reservation.status !== 'CONFIRMED' && reservation.status !== 'PENDING') {
      throw new AppError(409, 'Esta reserva ya no puede cancelarse');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: 'CANCELLED_USER' },
      });

      await tx.tableAssignment.deleteMany({
        where: { reservationId },
      });

      await tx.billingRecord.updateMany({
        where: { reservationId },
        data: { status: 'PENDING' },
      });
    });

    await this.prisma.notification.create({
      data: {
        userId,
        title: 'Reserva cancelada',
        body: `Tu reserva en ${reservation.restaurant?.name ?? 'el restaurante'} ha sido cancelada.`,
        type: 'reservation',
        data: { reservationId },
      },
    }).catch(() => {});

    const rest = await this.prisma.restaurant.findUnique({
      where: { id: reservation.restaurantId },
      select: { email: true, name: true },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    if (rest?.email) {
      try {
        await emailQueue.add('restaurant-cancellation', {
          type: 'RESTAURANT_CANCELLATION',
          restaurantEmail: rest.email,
          restaurantName: rest.name,
          userName: user?.name ?? 'Cliente',
          date: reservation.date instanceof Date ? reservation.date.toISOString().split('T')[0] : reservation.date,
          time: reservation.time,
          partySize: reservation.partySize,
          code: reservation.code,
        });
      } catch { /* queue may not be running */ }
    }

    return toDTO({ ...reservation, status: 'CANCELLED_USER' });
  }

  async getUserReservations(userId: string) {
    const reservations = await this.prisma.reservation.findMany({
      where: { userId },
      include: RESERVATION_INCLUDE,
      orderBy: { date: 'desc' },
    });
    return reservations.map(toDTO);
  }

  async getById(userId: string, reservationId: string) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, userId },
      include: RESERVATION_INCLUDE,
    });
    return reservation ? toDTO(reservation) : null;
  }
}
