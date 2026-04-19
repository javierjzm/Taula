import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { prismaPlugin } from './plugins/prisma.plugin';
import { redisPlugin } from './plugins/redis.plugin';
import { corsPlugin } from './plugins/cors.plugin';
import { authRoutes } from './routes/auth';
import { restaurantRoutes } from './routes/restaurants';
import { reservationRoutes } from './routes/reservations';
import { reviewRoutes } from './routes/reviews';
import { meRoutes } from './routes/me';
import { restaurantPanelRoutes } from './routes/restaurant-panel';
import { adminRoutes } from './routes/admin';
import { notificationRoutes } from './routes/notifications';
import { AppError } from './utils/errors';
import { NoShowCronService } from './services/noshow-cron.service';
import { startReminderCron } from './jobs/reminders';

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty' }
        : undefined,
  },
});

app.register(corsPlugin);
app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
app.register(prismaPlugin);
app.register(redisPlugin);

app.register(authRoutes, { prefix: '/v1/auth' });
app.register(restaurantRoutes, { prefix: '/v1/restaurants' });
app.register(reservationRoutes, { prefix: '/v1/reservations' });
app.register(reviewRoutes, { prefix: '/v1/reviews' });
app.register(meRoutes, { prefix: '/v1/me' });
app.register(restaurantPanelRoutes, { prefix: '/v1/restaurant' });
app.register(adminRoutes, { prefix: '/v1/admin' });
app.register(notificationRoutes, { prefix: '/v1/notifications' });

app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({
      statusCode: error.statusCode,
      error: error.name,
      message: error.message,
    });
  }

  if (error.validation) {
    return reply.code(422).send({
      statusCode: 422,
      error: 'Validation Error',
      message: error.message,
    });
  }

  app.log.error(error);
  return reply.code(500).send({
    statusCode: 500,
    error: 'Internal Server Error',
    message: 'Error interno del servidor',
  });
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Taula API running on port ${port}`);

    const noShowCron = new NoShowCronService(app.prisma);
    noShowCron.start();

    try {
      startReminderCron(app.prisma);
      console.log('Reminder cron started');
    } catch (err) {
      app.log.warn('Reminder cron could not start (Redis/BullMQ may be unavailable)');
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

export { app };
