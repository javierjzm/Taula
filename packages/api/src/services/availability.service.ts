import { PrismaClient } from '@prisma/client';

interface SlotResult {
  time: string;
  serviceName: string;
  availableTables: number;
}

interface TimelineEntry {
  reservationId: string;
  code: string;
  time: string;
  partySize: number;
  status: string;
  specialRequests: string | null;
  turnDuration: number;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  tableId: string | null;
  tableLabel: string | null;
  zoneName: string | null;
  zoneId: string | null;
}

export class AvailabilityService {
  constructor(private prisma: PrismaClient) {}

  async getAvailableSlots(
    restaurantId: string,
    date: string,
    partySize: number,
    zoneId?: string,
  ): Promise<SlotResult[]> {
    const dateObj = new Date(date + 'T00:00:00Z');
    const dayOfWeek = dateObj.getUTCDay();

    const blocked = await this.prisma.blockedDate.findFirst({
      where: { restaurantId, date: dateObj, isFullDay: true },
    });
    if (blocked) return [];

    const services = await this.prisma.service.findMany({
      where: {
        restaurantId,
        isActive: true,
        daysOfWeek: { has: dayOfWeek },
      },
    });
    if (services.length === 0) return [];

    const serviceBlockedIds = (
      await this.prisma.blockedDate.findMany({
        where: {
          restaurantId,
          date: dateObj,
          isFullDay: false,
          serviceId: { not: null },
        },
        select: { serviceId: true },
      })
    ).map((b) => b.serviceId);

    const tableWhere: any = { restaurantId, isActive: true };
    if (zoneId) tableWhere.zoneId = zoneId;
    const tables = await this.prisma.restaurantTable.findMany({
      where: { ...tableWhere, maxCovers: { gte: partySize } },
      include: { zone: true },
    });

    if (tables.length === 0) return [];

    const activeReservations = await this.prisma.reservation.findMany({
      where: {
        restaurantId,
        date: dateObj,
        status: { in: ['CONFIRMED', 'PENDING', 'ARRIVED'] },
      },
      include: { tableAssignment: true },
    });

    // Count unassigned reservations per slot to account for PENDING without table
    const unassignedReservations = activeReservations.filter((r) => !r.tableAssignment);

    const results: SlotResult[] = [];

    for (const service of services) {
      if (serviceBlockedIds.includes(service.id)) continue;

      const turnDuration = service.turnDuration;
      const slots = generateTimeSlots(service.startTime, service.endTime, service.slotInterval);

      for (const slotTime of slots) {
        const slotMinutes = timeToMinutes(slotTime);
        let availableCount = 0;

        for (const table of tables) {
          if (zoneId && table.zoneId !== zoneId) continue;
          if (table.maxCovers < partySize) continue;

          const isOccupied = activeReservations.some((res) => {
            if (!res.tableAssignment || res.tableAssignment.tableId !== table.id) return false;
            const resTurn = getTurnForReservation(res.time, services, turnDuration);
            const resStart = timeToMinutes(res.time);
            const resEnd = resStart + resTurn;
            const slotEnd = slotMinutes + turnDuration;
            return slotMinutes < resEnd && slotEnd > resStart;
          });

          if (!isOccupied) availableCount++;
        }

        // Subtract unassigned reservations that overlap this slot
        // (they will need a table but don't have one yet)
        const unassignedOverlap = unassignedReservations.filter((res) => {
          const resTurn = getTurnForReservation(res.time, services, turnDuration);
          const resStart = timeToMinutes(res.time);
          const resEnd = resStart + resTurn;
          const slotEnd = slotMinutes + turnDuration;
          return slotMinutes < resEnd && slotEnd > resStart;
        });

        // Only count tables that also fit the unassigned reservations' party sizes
        const effectiveAvailable = Math.max(0, availableCount - unassignedOverlap.length);

        if (effectiveAvailable > 0) {
          results.push({
            time: slotTime,
            serviceName: service.name,
            availableTables: effectiveAvailable,
          });
        }
      }
    }

    results.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    return results;
  }

  async assignTable(
    reservationId: string,
    restaurantId: string,
    date: string,
    time: string,
    partySize: number,
    turnDuration: number,
    zoneId?: string,
  ): Promise<{ tableId: string; tableLabel: string; zoneName: string } | null> {
    const dateObj = new Date(date + 'T00:00:00Z');

    const tableWhere: any = { restaurantId, isActive: true, maxCovers: { gte: partySize } };
    if (zoneId) tableWhere.zoneId = zoneId;

    const candidates = await this.prisma.restaurantTable.findMany({
      where: tableWhere,
      include: { zone: true },
      orderBy: { maxCovers: 'asc' },
    });

    const activeReservations = await this.prisma.reservation.findMany({
      where: {
        restaurantId,
        date: dateObj,
        status: { in: ['CONFIRMED', 'PENDING', 'ARRIVED'] },
        id: { not: reservationId },
      },
      include: { tableAssignment: true },
    });

    const slotMinutes = timeToMinutes(time);

    for (const table of candidates) {
      const isOccupied = activeReservations.some((res) => {
        if (!res.tableAssignment || res.tableAssignment.tableId !== table.id) return false;
        const resStart = timeToMinutes(res.time);
        const resEnd = resStart + turnDuration;
        const slotEnd = slotMinutes + turnDuration;
        return slotMinutes < resEnd && slotEnd > resStart;
      });

      if (!isOccupied) {
        await this.prisma.tableAssignment.upsert({
          where: { reservationId },
          create: { reservationId, tableId: table.id },
          update: { tableId: table.id },
        });
        return {
          tableId: table.id,
          tableLabel: table.label,
          zoneName: table.zone.name,
        };
      }
    }

    return null;
  }

  async checkBlocked(restaurantId: string, date: string, serviceId?: string): Promise<boolean> {
    const dateObj = new Date(date + 'T00:00:00Z');
    const where: any = { restaurantId, date: dateObj };

    if (serviceId) {
      where.OR = [{ isFullDay: true }, { serviceId }];
    }

    const count = await this.prisma.blockedDate.count({ where });
    return count > 0;
  }

  async getTurnDuration(restaurantId: string, date: string, time: string): Promise<number> {
    const dateObj = new Date(date + 'T00:00:00Z');
    const dayOfWeek = dateObj.getUTCDay();
    const minutes = timeToMinutes(time);

    const services = await this.prisma.service.findMany({
      where: {
        restaurantId,
        isActive: true,
        daysOfWeek: { has: dayOfWeek },
      },
    });

    for (const svc of services) {
      if (minutes >= timeToMinutes(svc.startTime) && minutes < timeToMinutes(svc.endTime)) {
        return svc.turnDuration;
      }
    }

    return 90;
  }

  async getTimeline(restaurantId: string, date: string): Promise<TimelineEntry[]> {
    const dateObj = new Date(date + 'T00:00:00Z');

    const services = await this.prisma.service.findMany({
      where: { restaurantId, isActive: true },
    });

    const reservations = await this.prisma.reservation.findMany({
      where: {
        restaurantId,
        date: dateObj,
        status: { notIn: ['CANCELLED_USER', 'CANCELLED_RESTAURANT'] },
      },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        tableAssignment: { include: { table: { include: { zone: true } } } },
      },
      orderBy: { time: 'asc' },
    });

    return reservations.map((r) => {
      const minutes = timeToMinutes(r.time);
      const matchedService = services.find(
        (s) => minutes >= timeToMinutes(s.startTime) && minutes < timeToMinutes(s.endTime),
      );

      return {
        reservationId: r.id,
        code: r.code,
        time: r.time,
        partySize: r.partySize,
        status: r.status,
        specialRequests: r.specialRequests,
        turnDuration: matchedService?.turnDuration ?? 90,
        userName: r.user.name,
        userEmail: r.user.email,
        userPhone: r.user.phone ?? null,
        tableId: r.tableAssignment?.tableId ?? null,
        tableLabel: r.tableAssignment?.table?.label ?? null,
        zoneName: r.tableAssignment?.table?.zone?.name ?? null,
        zoneId: r.tableAssignment?.table?.zoneId ?? null,
      };
    });
  }

  async getCalendarSummary(
    restaurantId: string,
    year: number,
    month: number,
  ): Promise<{ date: string; reservations: number; covers: number; blocked: boolean }[]> {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0));

    const reservations = await this.prisma.reservation.groupBy({
      by: ['date'],
      where: {
        restaurantId,
        date: { gte: startDate, lte: endDate },
        status: { notIn: ['CANCELLED_USER', 'CANCELLED_RESTAURANT'] },
      },
      _count: { id: true },
      _sum: { partySize: true },
    });

    const blocked = await this.prisma.blockedDate.findMany({
      where: {
        restaurantId,
        date: { gte: startDate, lte: endDate },
        isFullDay: true,
      },
      select: { date: true },
    });

    const blockedSet = new Set(blocked.map((b) => b.date.toISOString().split('T')[0]));

    const results: { date: string; reservations: number; covers: number; blocked: boolean }[] = [];

    for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayData = reservations.find(
        (r) => r.date.toISOString().split('T')[0] === dateStr,
      );
      results.push({
        date: dateStr,
        reservations: dayData?._count?.id ?? 0,
        covers: dayData?._sum?.partySize ?? 0,
        blocked: blockedSet.has(dateStr),
      });
    }

    return results;
  }
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function getTurnForReservation(
  resTime: string,
  services: { startTime: string; endTime: string; turnDuration: number }[],
  fallback: number,
): number {
  const minutes = timeToMinutes(resTime);
  for (const svc of services) {
    if (minutes >= timeToMinutes(svc.startTime) && minutes < timeToMinutes(svc.endTime)) {
      return svc.turnDuration;
    }
  }
  return fallback;
}

function generateTimeSlots(startTime: string, endTime: string, intervalMinutes: number): string[] {
  const slots: string[] = [];
  let current = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  while (current < end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    current += intervalMinutes;
  }

  return slots;
}
