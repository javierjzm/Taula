import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export class StripeService {
  constructor(private prisma: PrismaClient) {}

  private ensureStripe(): Stripe {
    if (!stripe) throw new Error('Stripe not configured');
    return stripe;
  }

  /**
   * Get or create a Stripe Customer for a user.
   */
  async getOrCreateCustomer(userId: string): Promise<string> {
    const s = this.ensureStripe();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    if (user.stripeCustomerId) return user.stripeCustomerId;

    const customer = await s.customers.create({
      email: user.email,
      name: user.name,
      metadata: { taulaUserId: userId },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  /**
   * Create a SetupIntent so the client can save a payment method
   * without charging immediately. Used for card guarantee.
   */
  async createSetupIntent(userId: string): Promise<{ clientSecret: string; customerId: string }> {
    const s = this.ensureStripe();
    const customerId = await this.getOrCreateCustomer(userId);

    const setupIntent = await s.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: { taulaUserId: userId },
    });

    return {
      clientSecret: setupIntent.client_secret!,
      customerId,
    };
  }

  /**
   * List saved payment methods for a user.
   */
  async listPaymentMethods(userId: string): Promise<Stripe.PaymentMethod[]> {
    const s = this.ensureStripe();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) return [];

    const methods = await s.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    });

    return methods.data;
  }

  /**
   * Charge a no-show penalty.
   * Creates a PaymentIntent and confirms it immediately using the saved card.
   */
  async chargeNoShow(
    reservationId: string,
  ): Promise<{ success: boolean; paymentIntentId?: string; error?: string }> {
    const s = this.ensureStripe();

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        restaurant: { select: { noShowFeePerPerson: true, name: true, stripeAccountId: true } },
        user: { select: { stripeCustomerId: true, email: true, name: true } },
      },
    });

    if (!reservation) return { success: false, error: 'Reservation not found' };
    if (!reservation.stripePaymentMethodId) return { success: false, error: 'No payment method' };
    if (!reservation.user.stripeCustomerId) return { success: false, error: 'No Stripe customer' };
    if (reservation.noShowCharged) return { success: false, error: 'Already charged' };

    const amount = Math.round(reservation.restaurant.noShowFeePerPerson * reservation.partySize * 100);

    try {
      const paymentIntent = await s.paymentIntents.create({
        amount,
        currency: 'eur',
        customer: reservation.user.stripeCustomerId,
        payment_method: reservation.stripePaymentMethodId,
        off_session: true,
        confirm: true,
        description: `No-show: ${reservation.restaurant.name} - ${reservation.code}`,
        metadata: {
          taulaReservationId: reservationId,
          taulaReservationCode: reservation.code,
          type: 'no_show_penalty',
        },
      });

      await this.prisma.reservation.update({
        where: { id: reservationId },
        data: {
          noShowCharged: true,
          noShowAmount: amount / 100,
          stripePaymentIntentId: paymentIntent.id,
        },
      });

      return { success: true, paymentIntentId: paymentIntent.id };
    } catch (err: any) {
      console.error(`No-show charge failed for ${reservationId}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Check if Stripe is configured and available.
   */
  isAvailable(): boolean {
    return !!stripe;
  }
}
