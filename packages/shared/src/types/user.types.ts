export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  phone: string | null;
  preferredLang: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─── NOTIFICACIONES ──────────────────────────────────────────
export type NotifScope = 'USER' | 'RESTAURANT';

export interface NotificationItem {
  id: string;
  scope: NotifScope;
  userId: string | null;
  restaurantId: string | null;
  title: string;
  body: string;
  type: string;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  confirmations: boolean;
  reminders: boolean;
  offers: boolean;
  newReservation: boolean;
  cancellation: boolean;
  newReview: boolean;
  planAlerts: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  confirmations: true,
  reminders: true,
  offers: false,
  newReservation: true,
  cancellation: true,
  newReview: true,
  planAlerts: true,
};
