-- ==============================================================================
-- Ardab Market - Migration: Add Deliveries & Fleet Logistics Module
-- ==============================================================================

-- 1. Create DeliveryStatus enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeliveryStatus') THEN
    CREATE TYPE "DeliveryStatus" AS ENUM (
      'PENDING',
      'READY_FOR_ASSIGNMENT',
      'ASSIGNED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'FAILED',
      'CANCELLED'
    );
  END IF;
END $$;

-- 2. Create TripStatus enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TripStatus') THEN
    CREATE TYPE "TripStatus" AS ENUM (
      'PLANNING',
      'LOADING',
      'READY',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED'
    );
  END IF;
END $$;

-- 3. Create vehicles table (Standard Ardab 5,000 KG Fleet Trucks)
CREATE TABLE IF NOT EXISTS "vehicles" (
  "id" VARCHAR(36) NOT NULL,
  "plateNumber" VARCHAR(64) NOT NULL,
  "model" VARCHAR(128) NOT NULL,
  "city" VARCHAR(100) NOT NULL,
  "capacityKg" DECIMAL(10,2) NOT NULL DEFAULT 5000.00,
  "status" VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vehicles_plateNumber_key" UNIQUE ("plateNumber")
);

CREATE INDEX IF NOT EXISTS "vehicles_plateNumber_idx" ON "vehicles"("plateNumber");
CREATE INDEX IF NOT EXISTS "vehicles_city_idx" ON "vehicles"("city");
CREATE INDEX IF NOT EXISTS "vehicles_status_idx" ON "vehicles"("status");

-- 4. Create drivers table (Transport Personnel & Staff Operators)
CREATE TABLE IF NOT EXISTS "drivers" (
  "id" VARCHAR(36) NOT NULL,
  "driverCode" VARCHAR(64) NOT NULL,
  "fullName" VARCHAR(255) NOT NULL,
  "phone" VARCHAR(50) NOT NULL,
  "email" VARCHAR(255),
  "city" VARCHAR(100) NOT NULL,
  "licenseNumber" VARCHAR(100),
  "status" VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "drivers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "drivers_driverCode_key" UNIQUE ("driverCode")
);

CREATE INDEX IF NOT EXISTS "drivers_driverCode_idx" ON "drivers"("driverCode");
CREATE INDEX IF NOT EXISTS "drivers_phone_idx" ON "drivers"("phone");
CREATE INDEX IF NOT EXISTS "drivers_city_idx" ON "drivers"("city");
CREATE INDEX IF NOT EXISTS "drivers_status_idx" ON "drivers"("status");

-- 5. Create trips table (Consolidated Multi-Order Delivery Runs up to 5,000 KG)
CREATE TABLE IF NOT EXISTS "trips" (
  "id" VARCHAR(36) NOT NULL,
  "tripNumber" VARCHAR(64) NOT NULL,
  "city" VARCHAR(100) NOT NULL,
  "vehicleId" VARCHAR(36),
  "driverId" VARCHAR(36),
  "status" "TripStatus" NOT NULL DEFAULT 'PLANNING',
  "maxCapacityKg" DECIMAL(10,2) NOT NULL DEFAULT 5000.00,
  "totalWeightKg" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "pickupHub" VARCHAR(255),
  "deliveryZones" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "trips_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trips_tripNumber_key" UNIQUE ("tripNumber"),
  CONSTRAINT "trips_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "trips_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "trips_tripNumber_idx" ON "trips"("tripNumber");
CREATE INDEX IF NOT EXISTS "trips_city_idx" ON "trips"("city");
CREATE INDEX IF NOT EXISTS "trips_status_idx" ON "trips"("status");
CREATE INDEX IF NOT EXISTS "trips_vehicleId_idx" ON "trips"("vehicleId");
CREATE INDEX IF NOT EXISTS "trips_driverId_idx" ON "trips"("driverId");
CREATE INDEX IF NOT EXISTS "trips_createdAt_idx" ON "trips"("createdAt");

-- 6. Create deliveries table (Individual Order Fulfillment Truth)
CREATE TABLE IF NOT EXISTS "deliveries" (
  "id" VARCHAR(36) NOT NULL,
  "deliveryNumber" VARCHAR(64) NOT NULL,
  "orderId" VARCHAR(36) NOT NULL,
  "customerId" VARCHAR(36) NOT NULL,
  "tripId" VARCHAR(36),
  "driverId" VARCHAR(36),
  "vehicleId" VARCHAR(36),
  "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "city" VARCHAR(100) NOT NULL,
  "deliveryZone" VARCHAR(100),
  "neighborhood" VARCHAR(100),
  "addressLine" TEXT NOT NULL,
  "recipientName" VARCHAR(255) NOT NULL,
  "recipientPhone" VARCHAR(50) NOT NULL,
  "latitude" DECIMAL(10,8),
  "longitude" DECIMAL(11,8),
  "scheduledAt" TIMESTAMP(3),
  "estimatedDeliveryAt" TIMESTAMP(3),
  "dispatchedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "deliveryNotes" TEXT,
  "failureReason" TEXT,
  "cancellationReason" TEXT,
  "proofOfDeliveryUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "deliveries_deliveryNumber_key" UNIQUE ("deliveryNumber"),
  CONSTRAINT "deliveries_orderId_key" UNIQUE ("orderId"),
  CONSTRAINT "deliveries_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "deliveries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "deliveries_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "deliveries_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "deliveries_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "deliveries_deliveryNumber_idx" ON "deliveries"("deliveryNumber");
CREATE INDEX IF NOT EXISTS "deliveries_orderId_idx" ON "deliveries"("orderId");
CREATE INDEX IF NOT EXISTS "deliveries_customerId_idx" ON "deliveries"("customerId");
CREATE INDEX IF NOT EXISTS "deliveries_tripId_idx" ON "deliveries"("tripId");
CREATE INDEX IF NOT EXISTS "deliveries_driverId_idx" ON "deliveries"("driverId");
CREATE INDEX IF NOT EXISTS "deliveries_vehicleId_idx" ON "deliveries"("vehicleId");
CREATE INDEX IF NOT EXISTS "deliveries_status_idx" ON "deliveries"("status");
CREATE INDEX IF NOT EXISTS "deliveries_city_idx" ON "deliveries"("city");
CREATE INDEX IF NOT EXISTS "deliveries_deliveryZone_idx" ON "deliveries"("deliveryZone");
CREATE INDEX IF NOT EXISTS "deliveries_scheduledAt_idx" ON "deliveries"("scheduledAt");
CREATE INDEX IF NOT EXISTS "deliveries_deliveredAt_idx" ON "deliveries"("deliveredAt");
CREATE INDEX IF NOT EXISTS "deliveries_createdAt_idx" ON "deliveries"("createdAt");

-- 7. Create delivery_activities table (Lifecycle Audit Trail)
CREATE TABLE IF NOT EXISTS "delivery_activities" (
  "id" VARCHAR(36) NOT NULL,
  "deliveryId" VARCHAR(36) NOT NULL,
  "action" VARCHAR(255) NOT NULL,
  "fromStatus" "DeliveryStatus",
  "toStatus" "DeliveryStatus",
  "description" TEXT NOT NULL,
  "actor" VARCHAR(100) NOT NULL DEFAULT 'Super Admin',
  "actorId" VARCHAR(36),
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "delivery_activities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "delivery_activities_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "delivery_activities_deliveryId_idx" ON "delivery_activities"("deliveryId");
CREATE INDEX IF NOT EXISTS "delivery_activities_deliveryId_createdAt_idx" ON "delivery_activities"("deliveryId", "createdAt");

-- 8. Create Sequences for sequential business identifiers
CREATE SEQUENCE IF NOT EXISTS delivery_number_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS trip_number_seq START WITH 1 INCREMENT BY 1;

-- 9. Seed Standard Initial Ardab Fleet Vehicles (5,000 KG Heavy Cargo Trucks)
INSERT INTO "vehicles" ("id", "plateNumber", "model", "city", "capacityKg", "status", "createdAt", "updatedAt")
VALUES
  ('vh-gdr-001', 'ET-3-A4928', 'Isuzu NPR Cargo 5T', 'Gondar', 5000.00, 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('vh-gdr-002', 'ET-3-A5012', 'Isuzu NPR Cargo 5T', 'Gondar', 5000.00, 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('vh-bdr-001', 'ET-3-B7120', 'Isuzu NPR Cargo 5T', 'Bahir Dar', 5000.00, 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('vh-bdr-002', 'ET-3-B7199', 'Isuzu NPR Cargo 5T', 'Bahir Dar', 5000.00, 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('vh-add-001', 'ET-3-C8814', 'Isuzu NPR Cargo 5T', 'Addis Ababa', 5000.00, 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("plateNumber") DO NOTHING;

-- 10. Seed Standard Initial Ardab Drivers (Verified Transport Operators)
INSERT INTO "drivers" ("id", "driverCode", "fullName", "phone", "email", "city", "licenseNumber", "status", "createdAt", "updatedAt")
VALUES
  ('drv-gdr-101', 'DRV-101', 'Bekele Tessema', '+251 91 190 4432', 'bekele.t@ardabmarket.com', 'Gondar', 'ETH-GD-38912', 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('drv-gdr-102', 'DRV-102', 'Dawit Haile', '+251 92 233 8812', 'dawit.h@ardabmarket.com', 'Gondar', 'ETH-GD-41092', 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('drv-bdr-103', 'DRV-103', 'Mulugeta Assefa', '+251 93 344 1122', 'mulugeta.a@ardabmarket.com', 'Bahir Dar', 'ETH-BD-55120', 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('drv-bdr-104', 'DRV-104', 'Yonas Kassahun', '+251 91 887 6655', 'yonas.k@ardabmarket.com', 'Bahir Dar', 'ETH-BD-55904', 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('drv-add-105', 'DRV-105', 'Tadesse Alemu', '+251 91 223 9988', 'tadesse.a@ardabmarket.com', 'Addis Ababa', 'ETH-AA-77441', 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("driverCode") DO NOTHING;

-- 11. Safe backfill: Create initial Deliveries for existing orders that lack one
INSERT INTO "deliveries" (
  "id",
  "deliveryNumber",
  "orderId",
  "customerId",
  "status",
  "city",
  "deliveryZone",
  "neighborhood",
  "addressLine",
  "recipientName",
  "recipientPhone",
  "latitude",
  "longitude",
  "deliveryFee",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::varchar,
  'DEL-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('delivery_number_seq')::text, 6, '0'),
  o."id",
  o."customerId",
  CASE
    WHEN o."status" = 'DELIVERED' THEN 'DELIVERED'::"DeliveryStatus"
    WHEN o."status" = 'IN_TRANSIT' THEN 'OUT_FOR_DELIVERY'::"DeliveryStatus"
    WHEN o."status" = 'READY_FOR_DELIVERY' THEN 'READY_FOR_ASSIGNMENT'::"DeliveryStatus"
    WHEN o."status" = 'CANCELLED' THEN 'CANCELLED'::"DeliveryStatus"
    WHEN o."status" = 'FAILED' THEN 'FAILED'::"DeliveryStatus"
    ELSE 'PENDING'::"DeliveryStatus"
  END,
  o."city",
  COALESCE(oda."deliveryZone", o."deliveryZone", 'Central Zone'),
  COALESCE(oda."neighborhood", 'District 1'),
  COALESCE(oda."addressLine", o."deliveryAddress", 'Standard Delivery Address'),
  COALESCE(oda."recipientName", c."fullName"),
  COALESCE(oda."phone", c."phone"),
  oda."latitude",
  oda."longitude",
  o."deliveryFee",
  o."createdAt",
  o."updatedAt"
FROM "orders" o
JOIN "customers" c ON o."customerId" = c."id"
LEFT JOIN "order_delivery_addresses" oda ON oda."orderId" = o."id"
WHERE NOT EXISTS (
  SELECT 1 FROM "deliveries" d WHERE d."orderId" = o."id"
);
