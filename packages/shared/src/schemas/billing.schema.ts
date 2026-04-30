import { z } from 'zod';

export const planTypeSchema = z.enum(['RESERVATIONS', 'LISTING_BASIC', 'LISTING_FEATURED']);

export const subscriptionStatusSchema = z.enum([
  'INCOMPLETE',
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'CANCELED',
  'ADMIN_GRANT',
]);

export const checkoutSchema = z.object({
  plan: planTypeSchema,
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const grantPlanSchema = z.object({
  plan: planTypeSchema,
  until: z.string().datetime().optional(),
});

export const ownerRoleSchema = z.enum(['OWNER', 'MANAGER', 'STAFF']);

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type GrantPlanInput = z.infer<typeof grantPlanSchema>;
