import { z } from 'zod';

export const notificationPreferencesSchema = z.object({
  confirmations: z.boolean().optional(),
  reminders: z.boolean().optional(),
  offers: z.boolean().optional(),
  newReservation: z.boolean().optional(),
  cancellation: z.boolean().optional(),
  newReview: z.boolean().optional(),
  planAlerts: z.boolean().optional(),
});

export const notifScopeSchema = z.enum(['USER', 'RESTAURANT']);

export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;
