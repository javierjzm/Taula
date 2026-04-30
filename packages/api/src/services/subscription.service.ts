import Stripe from 'stripe';
import { PrismaClient, PlanType, SubscriptionStatus } from '@prisma/client';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

type StripeClient = InstanceType<typeof Stripe>;
type StripeSubscriptionLike = {
  id: string;
  status: string;
  metadata?: Record<string, string>;
  customer?: string | { id?: string } | null;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
};

const PLAN_PRICE_ENV: Record<PlanType, string> = {
  RESERVATIONS: 'STRIPE_PRICE_PLAN_A',
  LISTING_BASIC: 'STRIPE_PRICE_PLAN_B_BASIC',
  LISTING_FEATURED: 'STRIPE_PRICE_PLAN_B_FEATURED',
};

export class SubscriptionService {
  constructor(private prisma: PrismaClient) {}

  isStripeAvailable(): boolean {
    return !!stripe;
  }

  private ensureStripe(): StripeClient {
    if (!stripe) throw new Error('Stripe no configurado en este entorno');
    return stripe;
  }

  private getPriceId(plan: PlanType): string {
    const envKey = PLAN_PRICE_ENV[plan];
    const priceId = process.env[envKey];
    if (!priceId) {
      throw new Error(`Falta variable de entorno ${envKey} para el plan ${plan}`);
    }
    return priceId;
  }

  /**
   * Asegura que existe un Stripe Customer para el restaurante (usa email
   * del primer owner como contact y guarda el id en Subscription).
   */
  async getOrCreateCustomer(restaurantId: string): Promise<string> {
    const s = this.ensureStripe();

    const existing = await this.prisma.subscription.findUnique({
      where: { restaurantId },
      select: { stripeCustomerId: true },
    });
    if (existing?.stripeCustomerId) return existing.stripeCustomerId;

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        owners: {
          include: { user: { select: { email: true, name: true } } },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
    });
    if (!restaurant) throw new Error('Restaurante no encontrado');

    const ownerEmail = restaurant.owners[0]?.user.email ?? restaurant.email ?? undefined;
    const customer = await s.customers.create({
      email: ownerEmail,
      name: restaurant.name,
      metadata: { taulaRestaurantId: restaurantId },
    });

    await this.prisma.subscription.upsert({
      where: { restaurantId },
      update: { stripeCustomerId: customer.id },
      create: {
        restaurantId,
        plan: 'RESERVATIONS',
        status: 'INCOMPLETE',
        stripeCustomerId: customer.id,
      },
    });

    return customer.id;
  }

  async createCheckoutSession(
    restaurantId: string,
    plan: PlanType,
    opts: { successUrl?: string; cancelUrl?: string } = {},
  ): Promise<{ url: string }> {
    const s = this.ensureStripe();
    const customerId = await this.getOrCreateCustomer(restaurantId);
    const priceId = this.getPriceId(plan);

    const session = await s.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: opts.successUrl ?? 'https://taula.ad/billing/success',
      cancel_url: opts.cancelUrl ?? 'https://taula.ad/billing/cancel',
      subscription_data: {
        metadata: {
          taulaRestaurantId: restaurantId,
          taulaPlan: plan,
        },
      },
      metadata: { taulaRestaurantId: restaurantId, taulaPlan: plan },
    });
    if (!session.url) throw new Error('Stripe no devolvio URL');

    return { url: session.url };
  }

  async createPortalSession(
    restaurantId: string,
    returnUrl?: string,
  ): Promise<{ url: string }> {
    const s = this.ensureStripe();
    const customerId = await this.getOrCreateCustomer(restaurantId);
    const session = await s.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl ?? 'https://taula.ad/billing',
    });
    return { url: session.url };
  }

  async cancelAtPeriodEnd(restaurantId: string): Promise<void> {
    const s = this.ensureStripe();
    const sub = await this.prisma.subscription.findUnique({ where: { restaurantId } });
    if (!sub?.stripeSubscriptionId) throw new Error('No hay suscripcion activa');
    await s.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    await this.prisma.subscription.update({
      where: { restaurantId },
      data: { cancelAtPeriodEnd: true },
    });
  }

  /**
   * Sincroniza el estado de Subscription a partir de un evento de Stripe.
   * Llamado desde el webhook.
   */
  async syncFromStripe(stripeSubscription: StripeSubscriptionLike): Promise<void> {
    const restaurantId =
      (stripeSubscription.metadata?.taulaRestaurantId as string | undefined) ?? null;
    if (!restaurantId) return;

    const planMeta = stripeSubscription.metadata?.taulaPlan as PlanType | undefined;
    const plan: PlanType = planMeta ?? 'RESERVATIONS';

    const status: SubscriptionStatus = mapStripeStatus(stripeSubscription.status);

    const periodEndUnix = stripeSubscription.current_period_end;

    await this.prisma.subscription.upsert({
      where: { restaurantId },
      update: {
        plan,
        status,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId:
          typeof stripeSubscription.customer === 'string'
            ? stripeSubscription.customer
            : stripeSubscription.customer?.id ?? null,
        currentPeriodEnd: periodEndUnix ? new Date(periodEndUnix * 1000) : null,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end ?? false,
      },
      create: {
        restaurantId,
        plan,
        status,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId:
          typeof stripeSubscription.customer === 'string'
            ? stripeSubscription.customer
            : stripeSubscription.customer?.id ?? null,
        currentPeriodEnd: periodEndUnix ? new Date(periodEndUnix * 1000) : null,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end ?? false,
      },
    });
  }

  /**
   * Para uso del admin: concede un plan gratis hasta una fecha.
   */
  async grantPlanByAdmin(
    restaurantId: string,
    plan: PlanType,
    until?: Date,
  ): Promise<void> {
    await this.prisma.subscription.upsert({
      where: { restaurantId },
      update: {
        plan,
        status: 'ADMIN_GRANT',
        adminGranted: true,
        adminGrantUntil: until ?? null,
      },
      create: {
        restaurantId,
        plan,
        status: 'ADMIN_GRANT',
        adminGranted: true,
        adminGrantUntil: until ?? null,
      },
    });
  }

  async revokePlanByAdmin(restaurantId: string): Promise<void> {
    await this.prisma.subscription.update({
      where: { restaurantId },
      data: {
        status: 'CANCELED',
        adminGranted: false,
        adminGrantUntil: null,
      },
    });
  }

  /**
   * Comprueba si el restaurante tiene un plan activo con derecho al sistema
   * de reservas Taula.
   */
  static hasReservationsAccess(sub: {
    plan: PlanType;
    status: SubscriptionStatus;
    adminGrantUntil?: Date | null;
  } | null): boolean {
    if (!sub) return false;
    if (sub.plan !== 'RESERVATIONS') return false;
    return isActiveStatus(sub.status, sub.adminGrantUntil ?? null);
  }

  static isFeatured(sub: {
    plan: PlanType;
    status: SubscriptionStatus;
    adminGrantUntil?: Date | null;
  } | null): boolean {
    if (!sub) return false;
    if (sub.plan !== 'LISTING_FEATURED') return false;
    return isActiveStatus(sub.status, sub.adminGrantUntil ?? null);
  }

  static isListingOnly(sub: {
    plan: PlanType;
    status: SubscriptionStatus;
    adminGrantUntil?: Date | null;
  } | null): boolean {
    if (!sub) return false;
    if (sub.plan !== 'LISTING_BASIC' && sub.plan !== 'LISTING_FEATURED') return false;
    return isActiveStatus(sub.status, sub.adminGrantUntil ?? null);
  }
}

function mapStripeStatus(s: string): SubscriptionStatus {
  switch (s) {
    case 'active':
      return 'ACTIVE';
    case 'trialing':
      return 'TRIALING';
    case 'past_due':
    case 'unpaid':
      return 'PAST_DUE';
    case 'canceled':
    case 'incomplete_expired':
      return 'CANCELED';
    case 'incomplete':
    case 'paused':
    default:
      return 'INCOMPLETE';
  }
}

function isActiveStatus(
  status: SubscriptionStatus,
  adminGrantUntil: Date | null,
): boolean {
  if (status === 'ACTIVE' || status === 'TRIALING') return true;
  if (status === 'ADMIN_GRANT') {
    if (!adminGrantUntil) return true;
    return adminGrantUntil.getTime() > Date.now();
  }
  return false;
}
