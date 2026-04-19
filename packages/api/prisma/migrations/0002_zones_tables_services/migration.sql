-- AlterEnum: add PENDING to ReservationStatus
ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS 'PENDING' BEFORE 'CONFIRMED';

-- Add new columns to restaurants
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "requiresApproval" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "minAdvanceMinutes" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "restaurants" ADD COLUMN IF NOT EXISTS "maxAdvanceDays" INTEGER NOT NULL DEFAULT 30;

-- CreateTable: zones
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable: restaurant_tables
CREATE TABLE "restaurant_tables" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "minCovers" INTEGER NOT NULL DEFAULT 1,
    "maxCovers" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "restaurant_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable: services
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotInterval" INTEGER NOT NULL DEFAULT 30,
    "turnDuration" INTEGER NOT NULL DEFAULT 90,
    "daysOfWeek" INTEGER[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable: blocked_dates
CREATE TABLE "blocked_dates" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,
    "isFullDay" BOOLEAN NOT NULL DEFAULT true,
    "serviceId" TEXT,

    CONSTRAINT "blocked_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: table_assignments
CREATE TABLE "table_assignments" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,

    CONSTRAINT "table_assignments_pkey" PRIMARY KEY ("id")
);

-- Add zoneId column to reservations (nullable)
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "zoneId" TEXT;

-- CreateIndex
CREATE INDEX "zones_restaurantId_idx" ON "zones"("restaurantId");
CREATE INDEX "restaurant_tables_restaurantId_idx" ON "restaurant_tables"("restaurantId");
CREATE INDEX "restaurant_tables_zoneId_idx" ON "restaurant_tables"("zoneId");
CREATE INDEX "services_restaurantId_idx" ON "services"("restaurantId");
CREATE INDEX "blocked_dates_restaurantId_date_idx" ON "blocked_dates"("restaurantId", "date");
CREATE UNIQUE INDEX "table_assignments_reservationId_key" ON "table_assignments"("reservationId");
CREATE INDEX "table_assignments_tableId_idx" ON "table_assignments"("tableId");

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "services" ADD CONSTRAINT "services_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blocked_dates" ADD CONSTRAINT "blocked_dates_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blocked_dates" ADD CONSTRAINT "blocked_dates_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "table_assignments" ADD CONSTRAINT "table_assignments_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "table_assignments" ADD CONSTRAINT "table_assignments_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "restaurant_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old slotId FK and column from reservations
ALTER TABLE "reservations" DROP CONSTRAINT IF EXISTS "reservations_slotId_fkey";
ALTER TABLE "reservations" DROP COLUMN IF EXISTS "slotId";

-- Drop old availability_slots table
DROP TABLE IF EXISTS "availability_slots";
