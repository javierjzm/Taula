-- ── ENUMS ──────────────────────────────────────────────────────
CREATE TYPE "OwnerRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF');
CREATE TYPE "NotifScope" AS ENUM ('USER', 'RESTAURANT');
CREATE TYPE "PlanType" AS ENUM ('RESERVATIONS', 'LISTING_BASIC', 'LISTING_FEATURED');
CREATE TYPE "SubscriptionStatus" AS ENUM ('INCOMPLETE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'ADMIN_GRANT');

-- ── RESTAURANT_OWNERS: refactor a join table ───────────────────
DROP INDEX IF EXISTS "restaurant_owners_email_key";
DROP INDEX IF EXISTS "restaurant_owners_restaurantId_key";

ALTER TABLE "restaurant_owners" DROP CONSTRAINT IF EXISTS "restaurant_owners_restaurantId_fkey";

DELETE FROM "restaurant_owners";

ALTER TABLE "restaurant_owners" DROP COLUMN IF EXISTS "email";
ALTER TABLE "restaurant_owners" DROP COLUMN IF EXISTS "name";
ALTER TABLE "restaurant_owners" DROP COLUMN IF EXISTS "passwordHash";

ALTER TABLE "restaurant_owners" ADD COLUMN "userId" TEXT NOT NULL;
ALTER TABLE "restaurant_owners" ADD COLUMN "role" "OwnerRole" NOT NULL DEFAULT 'OWNER';

CREATE UNIQUE INDEX "restaurant_owners_userId_restaurantId_key" ON "restaurant_owners"("userId", "restaurantId");
CREATE INDEX "restaurant_owners_userId_idx" ON "restaurant_owners"("userId");
CREATE INDEX "restaurant_owners_restaurantId_idx" ON "restaurant_owners"("restaurantId");

ALTER TABLE "restaurant_owners"
  ADD CONSTRAINT "restaurant_owners_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "restaurant_owners"
  ADD CONSTRAINT "restaurant_owners_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── RESTAURANT: external reservation url (Plan B) ──────────────
ALTER TABLE "restaurants" ADD COLUMN "externalReservationUrl" TEXT;

-- ── NOTIFICATIONS: scope + restaurantId, userId opcional ───────
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'general',
  "data" JSONB,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_userId_fkey'
  ) THEN
    ALTER TABLE "notifications"
      ADD CONSTRAINT "notifications_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "notifications_userId_read_idx" ON "notifications"("userId", "read");

ALTER TABLE "notifications" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "restaurantId" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "scope" "NotifScope" NOT NULL DEFAULT 'USER';

CREATE INDEX IF NOT EXISTS "notifications_restaurantId_read_idx" ON "notifications"("restaurantId", "read");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_restaurantId_fkey'
  ) THEN
    ALTER TABLE "notifications"
      ADD CONSTRAINT "notifications_restaurantId_fkey"
      FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── NOTIFICATION_PREFERENCES ───────────────────────────────────
CREATE TABLE "notification_preferences" (
  "userId" TEXT NOT NULL,
  "confirmations" BOOLEAN NOT NULL DEFAULT true,
  "reminders" BOOLEAN NOT NULL DEFAULT true,
  "offers" BOOLEAN NOT NULL DEFAULT false,
  "newReservation" BOOLEAN NOT NULL DEFAULT true,
  "cancellation" BOOLEAN NOT NULL DEFAULT true,
  "newReview" BOOLEAN NOT NULL DEFAULT true,
  "planAlerts" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "notification_preferences"
  ADD CONSTRAINT "notification_preferences_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── SUBSCRIPTIONS ──────────────────────────────────────────────
CREATE TABLE "subscriptions" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "plan" "PlanType" NOT NULL,
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  "currentPeriodEnd" TIMESTAMP(3),
  "adminGranted" BOOLEAN NOT NULL DEFAULT false,
  "adminGrantUntil" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscriptions_restaurantId_key" ON "subscriptions"("restaurantId");
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
