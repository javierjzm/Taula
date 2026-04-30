import { PrismaClient } from '@prisma/client';
import { addDays, format, setHours, setMinutes } from 'date-fns';
import { AppError } from '../utils/errors';

export class SlotService {
  constructor(private prisma: PrismaClient) {}

  private get availabilitySlot() {
    // Legacy slot API kept for old tests/routes. The current availability engine
    // is table/service based, so Prisma no longer exposes this model in schema.
    return (this.prisma as any).availabilitySlot;
  }

  async generateSlotsForRestaurant(restaurantId: string, daysAhead = 60) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { hours: true },
    });
    if (!restaurant) throw new AppError(404, 'Restaurante no encontrado');

    const today = new Date();
    const slotsToCreate = [];

    for (let i = 0; i < daysAhead; i++) {
      const date = addDays(today, i);
      const dayOfWeek = date.getDay();
      const hours = restaurant.hours.find((h) => h.dayOfWeek === dayOfWeek);

      if (!hours || hours.isClosed) continue;

      const [openH, openM] = hours.openTime.split(':').map(Number);
      const [closeH, closeM] = hours.closeTime.split(':').map(Number);

      let current = setMinutes(setHours(date, openH), openM);
      const close = setMinutes(setHours(date, closeH), closeM);

      while (current < close) {
        slotsToCreate.push({
          restaurantId,
          date: new Date(format(date, 'yyyy-MM-dd')),
          time: format(current, 'HH:mm'),
          maxCovers: 20,
          bookedCovers: 0,
          isBlocked: false,
        });
        current = new Date(current.getTime() + 30 * 60 * 1000);
      }
    }

    await this.prisma.$transaction(
      slotsToCreate.map((slot) =>
        this.availabilitySlot.upsert({
          where: {
            restaurantId_date_time: {
              restaurantId: slot.restaurantId,
              date: slot.date,
              time: slot.time,
            },
          },
          create: slot,
          update: {},
        }),
      ),
    );

    return slotsToCreate.length;
  }

  async blockSlot(restaurantId: string, slotId: string) {
    const slot = await this.availabilitySlot.findFirst({
      where: { id: slotId, restaurantId },
    });
    if (!slot) throw new AppError(404, 'Slot no encontrado');

    return this.availabilitySlot.update({
      where: { id: slotId },
      data: { isBlocked: true },
    });
  }

  async unblockSlot(restaurantId: string, slotId: string) {
    const slot = await this.availabilitySlot.findFirst({
      where: { id: slotId, restaurantId },
    });
    if (!slot) throw new AppError(404, 'Slot no encontrado');

    return this.availabilitySlot.update({
      where: { id: slotId },
      data: { isBlocked: false },
    });
  }
}
