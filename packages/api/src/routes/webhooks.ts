import { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { SubscriptionService } from '../services/subscription.service';
import { NotificationService } from '../services/notification.service';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

type StripeEventLike = {
  type: string;
  data: { object: unknown };
};
type StripeSubscriptionLike = {
  id: string;
  status: string;
  metadata?: Record<string, string>;
  customer?: string | { id?: string } | null;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
};
type StripeInvoiceLike = {
  subscription?: string | { id?: string } | null;
};

export const webhookRoutes = async (fastify: FastifyInstance) => {
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_req, body, done) => {
      done(null, body);
    },
  );

  const subService = new SubscriptionService(fastify.prisma);
  const notifService = new NotificationService(fastify.prisma);

  fastify.post('/stripe', async (request, reply) => {
    if (!stripe) {
      return reply.code(503).send({ message: 'Stripe no configurado' });
    }

    const sig = request.headers['stripe-signature'] as string | undefined;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!sig || !secret) {
      return reply.code(400).send({ message: 'Firma o secreto faltante' });
    }

    let event: StripeEventLike;
    try {
      const raw = request.body as Buffer;
      event = stripe.webhooks.constructEvent(raw, sig, secret) as StripeEventLike;
    } catch (err: any) {
      fastify.log.warn({ err }, 'Stripe webhook signature failed');
      return reply.code(400).send({ message: `Webhook invalido: ${err.message}` });
    }

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const sub = event.data.object as StripeSubscriptionLike;
          await subService.syncFromStripe(sub);
          if (event.type === 'customer.subscription.deleted') {
            const restaurantId = (sub.metadata?.taulaRestaurantId as string | undefined) ?? null;
            if (restaurantId) {
              await notifService.notifyRestaurant(restaurantId, {
                title: 'Suscripcion cancelada',
                body: 'La suscripcion del plan ha sido cancelada en Stripe.',
                type: 'plan',
                preferenceKey: 'planAlerts',
              });
            }
          }
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as StripeInvoiceLike;
          const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null;
          if (subscriptionId) {
            const sub = await fastify.prisma.subscription.findFirst({
              where: { stripeSubscriptionId: subscriptionId },
              select: { restaurantId: true },
            });
            if (sub) {
              await fastify.prisma.subscription.update({
                where: { restaurantId: sub.restaurantId },
                data: { status: 'PAST_DUE' },
              });
              await notifService.notifyRestaurant(sub.restaurantId, {
                title: 'Fallo de cobro del plan',
                body: 'Stripe no ha podido cobrar la suscripcion. Revisa tu metodo de pago.',
                type: 'plan',
                preferenceKey: 'planAlerts',
              });
            }
          }
          break;
        }
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as StripeInvoiceLike;
          const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : null;
          if (subscriptionId) {
            const sub = await fastify.prisma.subscription.findFirst({
              where: { stripeSubscriptionId: subscriptionId },
              select: { restaurantId: true },
            });
            if (sub) {
              await fastify.prisma.subscription.update({
                where: { restaurantId: sub.restaurantId },
                data: { status: 'ACTIVE' },
              });
            }
          }
          break;
        }
        default:
          break;
      }
    } catch (err) {
      fastify.log.error({ err }, 'Stripe webhook handler error');
      return reply.code(500).send({ message: 'Error procesando webhook' });
    }

    return { received: true };
  });
};
