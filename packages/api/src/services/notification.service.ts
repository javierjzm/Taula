import { PrismaClient, NotifScope, Prisma } from '@prisma/client';
import { sendPushNotification } from './push.service';

type PreferenceKey =
  | 'confirmations'
  | 'reminders'
  | 'offers'
  | 'newReservation'
  | 'cancellation'
  | 'newReview'
  | 'planAlerts';

interface BaseNotifInput {
  title: string;
  body: string;
  type?: string;
  data?: Record<string, unknown>;
  preferenceKey?: PreferenceKey;
}

interface UserNotifInput extends BaseNotifInput {
  userId: string;
}

interface RestaurantNotifInput extends BaseNotifInput {
  /** Notificar a todos los owners del restaurante */
}

export class NotificationService {
  constructor(private prisma: PrismaClient) {}

  async notifyUser(userId: string, input: UserNotifInput | BaseNotifInput): Promise<void> {
    const finalInput = 'userId' in input ? input : { ...input, userId };

    if (finalInput.preferenceKey) {
      const allowed = await this.userAllows(userId, finalInput.preferenceKey);
      if (!allowed) return;
    }

    const notif = await this.prisma.notification.create({
      data: {
        userId,
        scope: 'USER',
        title: finalInput.title,
        body: finalInput.body,
        type: finalInput.type ?? 'general',
        data: (finalInput.data as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    });
    if (user?.pushToken) {
      await sendPushNotification({
        pushToken: user.pushToken,
        title: finalInput.title,
        body: finalInput.body,
        data: {
          notificationId: notif.id,
          type: finalInput.type ?? 'general',
          ...stringifyData(finalInput.data),
        },
      }).catch(() => undefined);
    }
  }

  async notifyRestaurant(restaurantId: string, input: RestaurantNotifInput): Promise<void> {
    const notif = await this.prisma.notification.create({
      data: {
        restaurantId,
        scope: 'RESTAURANT',
        title: input.title,
        body: input.body,
        type: input.type ?? 'general',
        data: (input.data as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      },
    });

    const owners = await this.prisma.restaurantOwner.findMany({
      where: { restaurantId },
      include: { user: { select: { id: true, pushToken: true } } },
    });

    for (const owner of owners) {
      const user = owner.user;
      if (!user?.pushToken) continue;
      if (input.preferenceKey) {
        const allowed = await this.userAllows(user.id, input.preferenceKey);
        if (!allowed) continue;
      }
      await sendPushNotification({
        pushToken: user.pushToken,
        title: input.title,
        body: input.body,
        data: {
          scope: 'RESTAURANT',
          notificationId: notif.id,
          restaurantId,
          type: input.type ?? 'general',
          ...stringifyData(input.data),
        },
      }).catch(() => undefined);
    }
  }

  async listForUser(userId: string, opts: { take?: number; cursor?: string } = {}) {
    const items = await this.prisma.notification.findMany({
      where: { userId, scope: 'USER' },
      orderBy: { createdAt: 'desc' },
      take: opts.take ?? 50,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    });
    const unread = await this.prisma.notification.count({
      where: { userId, scope: 'USER', read: false },
    });
    return { items, unread };
  }

  async listForRestaurant(restaurantId: string, opts: { take?: number; cursor?: string } = {}) {
    const items = await this.prisma.notification.findMany({
      where: { restaurantId, scope: 'RESTAURANT' },
      orderBy: { createdAt: 'desc' },
      take: opts.take ?? 50,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    });
    const unread = await this.prisma.notification.count({
      where: { restaurantId, scope: 'RESTAURANT', read: false },
    });
    return { items, unread };
  }

  async markRead(scope: NotifScope, ownerId: string, notificationId: string): Promise<boolean> {
    const where =
      scope === 'USER'
        ? { id: notificationId, userId: ownerId, scope: 'USER' as const }
        : { id: notificationId, restaurantId: ownerId, scope: 'RESTAURANT' as const };
    const found = await this.prisma.notification.findFirst({ where });
    if (!found) return false;
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
    return true;
  }

  async markAllRead(scope: NotifScope, ownerId: string): Promise<void> {
    if (scope === 'USER') {
      await this.prisma.notification.updateMany({
        where: { userId: ownerId, scope: 'USER', read: false },
        data: { read: true },
      });
    } else {
      await this.prisma.notification.updateMany({
        where: { restaurantId: ownerId, scope: 'RESTAURANT', read: false },
        data: { read: true },
      });
    }
  }

  async getOrCreatePreferences(userId: string) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async updatePreferences(
    userId: string,
    patch: Partial<Record<PreferenceKey, boolean>>,
  ) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: patch,
      create: { userId, ...patch },
    });
  }

  private async userAllows(userId: string, key: PreferenceKey): Promise<boolean> {
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (!prefs) return true;
    return prefs[key] !== false;
  }
}

function stringifyData(
  data: Record<string, unknown> | undefined,
): Record<string, string> {
  if (!data) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    out[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return out;
}
