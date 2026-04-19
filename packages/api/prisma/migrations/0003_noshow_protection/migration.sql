-- Add no-show protection fields to restaurants
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "noShowProtection" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "noShowFeePerPerson" DOUBLE PRECISION NOT NULL DEFAULT 10;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "noShowGraceMins" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT;

-- Add Stripe customer ID to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;

-- Add card guarantee fields to reservations
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "cardGuarantee" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "stripePaymentMethodId" TEXT;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "noShowCharged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "noShowAmount" DOUBLE PRECISION;
