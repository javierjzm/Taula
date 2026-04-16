import { z } from 'zod';

export const createReservationSchema = z.object({
  restaurantId: z.string().cuid(),
  slotId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  partySize: z.number().int().min(1).max(20),
  specialRequests: z.string().max(500).optional(),
});

export const cancelReservationSchema = z.object({
  reason: z.string().max(200).optional(),
});
