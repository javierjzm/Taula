import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { emailQueue } from './queue';
import { addHours, subDays } from 'date-fns';
import { NotificationService } from '../services/notification.service';

export const startReminderCron = (prisma: PrismaClient) => {
  const notif = new NotificationService(prisma);

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
        user: { select: { id: true, name: true, email: true, pushToken: true } },
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

      await notif
        .notifyUser(res.user.id, {
          title: 'Recordatorio: tu reserva mañana',
          body: `${res.restaurant.name} · mañana a las ${res.time} · ${res.partySize} pers.`,
          type: 'reminder_24h',
          data: { reservationId: res.id, deepLink: `/reservation/${res.id}` },
          preferenceKey: 'reminders',
        })
        .catch(() => {});

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
        user: { select: { id: true, name: true, email: true, pushToken: true } },
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

      await notif
        .notifyUser(res.user.id, {
          title: 'Tu reserva es en 2h',
          body: `${res.restaurant.name} · hoy a las ${res.time}`,
          type: 'reminder_2h',
          data: { reservationId: res.id, deepLink: `/reservation/${res.id}` },
          preferenceKey: 'reminders',
        })
        .catch(() => {});

      await prisma.reservation.update({
        where: { id: res.id },
        data: { reminderSent2h: true },
      });
    }

    const yesterday = subDays(now, 1);
    const dayStart = new Date(yesterday);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(yesterday);
    dayEnd.setHours(23, 59, 59, 999);

    const arrivedYesterday = await prisma.reservation.findMany({
      where: {
        status: 'ARRIVED',
        reviewRequested: false,
        date: { gte: dayStart, lte: dayEnd },
      },
      include: {
        user: { select: { id: true, name: true } },
        restaurant: { select: { id: true, name: true, slug: true } },
      },
    });

    for (const res of arrivedYesterday) {
      const existingReview = await prisma.review.findFirst({
        where: { userId: res.user.id, restaurantId: res.restaurant.id, createdAt: { gte: dayStart } },
        select: { id: true },
      });
      if (existingReview) continue;

      await notif
        .notifyUser(res.user.id, {
          title: '¿Cómo fue tu visita?',
          body: `Cuenta tu experiencia en ${res.restaurant.name} y ayuda a otros comensales.`,
          type: 'review_reminder',
          data: {
            reservationId: res.id,
            restaurantId: res.restaurant.id,
            slug: res.restaurant.slug,
            deepLink: `/restaurant/${res.restaurant.slug}#reviews`,
          },
          preferenceKey: 'reminders',
        })
        .catch(() => {});

      await prisma.reservation.update({
        where: { id: res.id },
        data: { reviewRequested: true },
      });
    }
  });
};
