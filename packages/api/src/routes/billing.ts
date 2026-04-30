import { FastifyInstance } from 'fastify';
import { checkoutSchema } from '@taula/shared';
import { authenticateRestaurant } from '../middleware/restaurant-auth.middleware';
import { SubscriptionService } from '../services/subscription.service';

export const billingRoutes = async (fastify: FastifyInstance) => {
  const subService = new SubscriptionService(fastify.prisma);

  fastify.get(
    '/subscription',
    { preHandler: [authenticateRestaurant] },
    async (request) => {
      const subscription = await fastify.prisma.subscription.findUnique({
        where: { restaurantId: request.restaurantId },
      });

      const billingThisMonth = await fastify.prisma.billingRecord.aggregate({
        where: {
          restaurantId: request.restaurantId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amount: true, covers: true },
      });

      return {
        data: {
          subscription,
          stripeAvailable: subService.isStripeAvailable(),
          monthCovers: billingThisMonth._sum.covers ?? 0,
          monthAmount: billingThisMonth._sum.amount ?? 0,
        },
      };
    },
  );

  fastify.get(
    '/billing',
    { preHandler: [authenticateRestaurant] },
    async (request) => {
      const records = await fastify.prisma.billingRecord.findMany({
        where: { restaurantId: request.restaurantId },
        include: {
          reservation: {
            select: { code: true, date: true, time: true, partySize: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return { data: records };
    },
  );

  fastify.post(
    '/checkout',
    { preHandler: [authenticateRestaurant] },
    async (request, reply) => {
      const body = checkoutSchema.parse(request.body);
      if (!subService.isStripeAvailable()) {
        return reply
          .code(503)
          .send({ message: 'El cobro online no esta configurado en este entorno' });
      }
      try {
        const { url } = await subService.createCheckoutSession(
          request.restaurantId,
          body.plan,
          { successUrl: body.successUrl, cancelUrl: body.cancelUrl },
        );
        return { data: { url } };
      } catch (err: any) {
        return reply.code(400).send({ message: err.message ?? 'Error creando checkout' });
      }
    },
  );

  fastify.post(
    '/portal',
    { preHandler: [authenticateRestaurant] },
    async (request, reply) => {
      if (!subService.isStripeAvailable()) {
        return reply
          .code(503)
          .send({ message: 'El portal de facturacion no esta configurado' });
      }
      const body = (request.body as { returnUrl?: string } | undefined) ?? {};
      try {
        const { url } = await subService.createPortalSession(
          request.restaurantId,
          body.returnUrl,
        );
        return { data: { url } };
      } catch (err: any) {
        return reply.code(400).send({ message: err.message ?? 'Error abriendo portal' });
      }
    },
  );

  fastify.post(
    '/cancel',
    { preHandler: [authenticateRestaurant] },
    async (request, reply) => {
      try {
        await subService.cancelAtPeriodEnd(request.restaurantId);
        return { data: { success: true } };
      } catch (err: any) {
        return reply.code(400).send({ message: err.message });
      }
    },
  );
};
