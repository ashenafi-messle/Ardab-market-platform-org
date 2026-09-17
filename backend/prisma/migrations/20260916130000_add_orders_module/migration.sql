-- ==============================================================================
-- Ardab Market - Migration: Add Incoming Orders Module
-- ==============================================================================

-- 1. Add REJECTED status to OrderStatus enum
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- 2. Extend orders table with operational & financial fields
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalWeight" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "currency" VARCHAR(10) NOT NULL DEFAULT 'ETB',
  ADD COLUMN IF NOT EXISTS "customerNote" TEXT,
  ADD COLUMN IF NOT EXISTS "internalNote" TEXT,
  ADD COLUMN IF NOT EXISTS "idempotencyKey" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "processingAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "readyAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dispatchedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledReason" TEXT,
  ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rejectedReason" TEXT;

-- 3. Add unique constraint and indexes on orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_idempotencyKey_key'
  ) THEN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_idempotencyKey_key" UNIQUE ("idempotencyKey");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "orders_placedAt_idx" ON "orders"("placedAt");
CREATE INDEX IF NOT EXISTS "orders_createdAt_idx" ON "orders"("createdAt");

-- 4. Create order_items table (Immutable product snapshots)
CREATE TABLE IF NOT EXISTS "order_items" (
  "id" VARCHAR(36) NOT NULL,
  "orderId" VARCHAR(36) NOT NULL,
  "productId" VARCHAR(36),
  "productNameSnapshot" VARCHAR(255) NOT NULL,
  "itemCodeSnapshot" VARCHAR(64) NOT NULL,
  "unitSnapshot" VARCHAR(32) NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "weightPerUnit" DECIMAL(10,2) NOT NULL,
  "totalWeight" DECIMAL(10,2) NOT NULL,
  "subtotal" DECIMAL(12,2) NOT NULL,
  "sellerIdSnapshot" VARCHAR(36),
  "sellerNameSnapshot" VARCHAR(255),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "order_items_orderId_idx" ON "order_items"("orderId");
CREATE INDEX IF NOT EXISTS "order_items_productId_idx" ON "order_items"("productId");

-- 5. Create order_delivery_addresses table (Address snapshot preserved at checkout)
CREATE TABLE IF NOT EXISTS "order_delivery_addresses" (
  "id" VARCHAR(36) NOT NULL,
  "orderId" VARCHAR(36) NOT NULL,
  "recipientName" VARCHAR(255) NOT NULL,
  "phone" VARCHAR(50) NOT NULL,
  "city" VARCHAR(100) NOT NULL,
  "deliveryZone" VARCHAR(100),
  "neighborhood" VARCHAR(100),
  "addressLine" TEXT NOT NULL,
  "latitude" DECIMAL(10,8),
  "longitude" DECIMAL(11,8),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_delivery_addresses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_delivery_addresses_orderId_key" UNIQUE ("orderId"),
  CONSTRAINT "order_delivery_addresses_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 6. Create order_activities table (Lifecycle event history)
CREATE TABLE IF NOT EXISTS "order_activities" (
  "id" VARCHAR(36) NOT NULL,
  "orderId" VARCHAR(36) NOT NULL,
  "action" VARCHAR(255) NOT NULL,
  "fromStatus" "OrderStatus",
  "toStatus" "OrderStatus",
  "description" TEXT NOT NULL,
  "actor" VARCHAR(100) NOT NULL DEFAULT 'Super Admin',
  "actorId" VARCHAR(36),
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "order_activities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_activities_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "order_activities_orderId_idx" ON "order_activities"("orderId");
CREATE INDEX IF NOT EXISTS "order_activities_orderId_createdAt_idx" ON "order_activities"("orderId", "createdAt");

-- 7. Create sequence for sequential human-readable order numbers (ORD-YYYY-XXXXXX)
CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1 INCREMENT BY 1;
