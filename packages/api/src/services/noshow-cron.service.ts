import { PrismaClient } from '@prisma/client';
import { StripeService } from './stripe.service';
import { EmailService } from './email.service';

export class NoShowCronService {
  private stripeService: StripeService;
  private emailService: EmailService;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private prisma: PrismaClient) {
    this.stripeService = new StripeService(prisma);
    this.emailService = new EmailService(prisma);
  }

  start(intervalMs = 5 * 60 * 1000) {
    console.log('[NoShowCron] Starting (interval:', intervalMs / 1000, 's)');
    this.timer = setInterval(() => this.processNoShows(), intervalMs);
    this.processNoShows();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async processNoShows() {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const restaurants = await this.prisma.restaurant.findMany({
        where: { noShowProtection: true, isActive: true },
        select: { id: true, noShowGraceMins: true, noShowFeePerPerson: true, name: true, email: true },
      });

      for (const restaurant of restaurants) {
        const graceMins = restaurant.noShowGraceMins;

        const reservations = await this.prisma.reservation.findMany({
          where: {
            restaurantId: restaurant.id,
            date: today,
            status: 'CONFIRMED',
            cardGuarantee: true,
            noShowCharged: false,
            stripePaymentMethodId: { not: null },
          },
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        });

        for (const res of reservations) {
          const [hours, mins] = res.time.split(':').map(Number);
          const reservationTime = new Date(today);
          reservationTime.setHours(hours, mins, 0, 0);

          const graceDeadline = new Date(reservationTime.getTime() + graceMins * 60 * 1000);

          if (now < graceDeadline) continue;

          console.log(`[NoShowCron] Marking no-show: ${res.code} (${res.time})`);

          await this.prisma.reservation.update({
            where: { id: res.id },
            data: { status: 'NO_SHOW' },
          });

          if (this.stripeService.isAvailable()) {
            const chargeResult = await this.stripeService.chargeNoShow(res.id);
            if (chargeResult.success) {
              console.log(`[NoShowCron] Charged no-show for ${res.code}: ${restaurant.noShowFeePerPerson * res.partySize}€`);

              this.emailService.queueEmail({
                type: 'NoShowChargeEmail',
                to: res.user.email,
                userName: res.user.name,
                restaurantName: restaurant.name,
                reservationCode: res.code,
                amount: restaurant.noShowFeePerPerson * res.partySize,
                date: res.date.toISOString().split('T')[0],
                time: res.time,
              });

              if (restaurant.email) {
                this.emailService.queueEmail({
                  type: 'RestaurantNoShowChargedEmail',
                  to: restaurant.email,
                  restaurantName: restaurant.name,
                  reservationCode: res.code,
                  guestName: res.user.name,
                  amount: restaurant.noShowFeePerPerson * res.partySize,
                  date: res.date.toISOString().split('T')[0],
                  time: res.time,
                });
              }
            } else {
              console.error(`[NoShowCron] Charge failed for ${res.code}:`, chargeResult.error);
            }
          } else {
            console.log(`[NoShowCron] Stripe not available, skipping charge for ${res.code}`);
          }

          const assignment = await this.prisma.tableAssignment.findUnique({
            where: { reservationId: res.id },
          });
          if (assignment) {
            await this.prisma.tableAssignment.delete({ where: { id: assignment.id } });
          }
        }
      }
    } catch (err) {
      console.error('[NoShowCron] Error processing no-shows:', err);
    }
  }
}
