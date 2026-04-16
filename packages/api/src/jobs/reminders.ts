import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { emailQueue } from './queue';
import { addHours } from 'date-fns';

export const startReminderCron = (prisma: PrismaClient) => {
  cron.schedule('0 * * * *', async () => {
    const now = new Date();

    const in24h = addHours(now, 24);
    const reservations24h = await prisma.reservation.findMany({
      where: {
        status: 'CONFIRMED',
        reminderSent24h: false,
        date: {
          gte: new Date(in24h.toDateString()),
          lt: addHours(new Date(in24h.toDateString()), 1),
        },
      },
      include: {
        user: { select: { name: true, email: true, pushToken: true } },
        restaurant: { select: { name: true, address: true } },
      },
    });

    for (const res of reservations24h) {
      await emailQueue.add('reminder-24h', {
        type: 'REMINDER_24H',
        userEmail: res.user.email,
        userName: res.user.name,
        restaurantName: res.restaurant.name,
        restaurantAddress: res.restaurant.address,
        date: res.date.toISOString().split('T')[0],
        time: res.time,
        partySize: res.partySize,
        code: res.code,
      });

      await prisma.reservation.update({
        where: { id: res.id },
        data: { reminderSent24h: true },
      });
    }

    const in2h = addHours(now, 2);
    const reservations2h = await prisma.reservation.findMany({
      where: {
        status: 'CONFIRMED',
        reminderSent2h: false,
        date: {
          gte: new Date(in2h.toDateString()),
          lt: addHours(new Date(in2h.toDateString()), 1),
        },
      },
      include: {
        user: { select: { name: true, email: true, pushToken: true } },
        restaurant: { select: { name: true, address: true } },
      },
    });

    for (const res of reservations2h) {
      await emailQueue.add('reminder-2h', {
        type: 'REMINDER_2H',
        userEmail: res.user.email,
        userName: res.user.name,
        restaurantName: res.restaurant.name,
        restaurantAddress: res.restaurant.address,
        date: res.date.toISOString().split('T')[0],
        time: res.time,
        partySize: res.partySize,
        code: res.code,
      });

      await prisma.reservation.update({
        where: { id: res.id },
        data: { reminderSent2h: true },
      });
    }
  });
};
