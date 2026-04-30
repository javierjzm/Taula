import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, PlanType } from '@prisma/client';

/**
 * Devuelve un preHandler que exige que la suscripción del restaurante esté
 * activa y opcionalmente que sea de un plan concreto.
 *
 * - `requireReservations: true` exige plan RESERVATIONS activo (uso del
 *   sistema de reservas Taula). Bloquea Plan B Listing.
 */
export function requirePlan(opts: {
  prisma: PrismaClient;
  requireReservations?: boolean;
  allow?: PlanType[];
}) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const restaurantId = request.restaurantId;
    if (!restaurantId) {
      return reply.code(401).send({ message: 'No autenticado' });
    }
    const sub = await opts.prisma.subscription.findUnique({
      where: { restaurantId },
    });
    if (!sub) {
      return reply.code(402).send({
        message: 'No tienes plan activo',
        code: 'NO_PLAN',
      });
    }

    const active = isActive(sub.status, sub.adminGrantUntil);
    if (!active) {
      return reply.code(402).send({
        message: 'Tu plan no esta activo',
        code: 'PLAN_INACTIVE',
        plan: sub.plan,
        status: sub.status,
      });
    }

    if (opts.requireReservations && sub.plan !== 'RESERVATIONS') {
      return reply.code(402).send({
        message: 'Esta funcion requiere el plan Taula Reservations',
        code: 'WRONG_PLAN',
        plan: sub.plan,
      });
    }

    if (opts.allow && !opts.allow.includes(sub.plan)) {
      return reply.code(402).send({
        message: 'Tu plan actual no incluye esta funcion',
        code: 'WRONG_PLAN',
        plan: sub.plan,
      });
    }
  };
}

function isActive(status: string, adminGrantUntil: Date | null): boolean {
  if (status === 'ACTIVE' || status === 'TRIALING') return true;
  if (status === 'ADMIN_GRANT') {
    if (!adminGrantUntil) return true;
    return adminGrantUntil.getTime() > Date.now();
  }
  return false;
}
