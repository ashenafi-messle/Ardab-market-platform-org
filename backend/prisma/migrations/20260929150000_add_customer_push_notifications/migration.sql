-- ==============================================================================
-- Ardab Market - Migration: Add Customer Push Notifications & Notification Ext
-- ==============================================================================

-- 1. Add new notification types to NotificationType enum if not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'NEW_PRODUCT' AND enumtypid = 'NotificationType'::regtype) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'NEW_PRODUCT';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PRODUCT_DISCOUNT' AND enumtypid = 'NotificationType'::regtype) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'PRODUCT_DISCOUNT';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ORDER_PLACED' AND enumtypid = 'NotificationType'::regtype) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'ORDER_PLACED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ORDER_CONFIRMED' AND enumtypid = 'NotificationType'::regtype) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'ORDER_CONFIRMED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PAYMENT_CONFIRMED' AND enumtypid = 'NotificationType'::regtype) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_CONFIRMED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ORDER_PROCESSING' AND enumtypid = 'NotificationType'::regtype) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'ORDER_PROCESSING';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ORDER_PACKED' AND enumtypid = 'NotificationType'::regtype) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'ORDER_PACKED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ORDER_OUT_FOR_DELIVERY' AND enumtypid = 'NotificationType'::regtype) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'ORDER_OUT_FOR_DELIVERY';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ORDER_DELIVERED' AND enumtypid = 'NotificationType'::regtype) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'ORDER_DELIVERED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ORDER_CANCELLED' AND enumtypid = 'NotificationType'::regtype) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'ORDER_CANCELLED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SYSTEM' AND enumtypid = 'NotificationType'::regtype) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'SYSTEM';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PROMOTION' AND enumtypid = 'NotificationType'::regtype) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'PROMOTION';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SUPPORT' AND enumtypid = 'NotificationType'::regtype) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'SUPPORT';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SECURITY' AND enumtypid = 'NotificationType'::regtype) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'SECURITY';
  END IF;
END $$;

-- 2. Create DevicePlatform enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DevicePlatform') THEN
    CREATE TYPE "DevicePlatform" AS ENUM ('ANDROID', 'IOS', 'WEB');
  END IF;
END $$;

-- 3. Create NotificationDeliveryStatus enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationDeliveryStatus') THEN
    CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'INVALID_TOKEN');
  END IF;
END $$;

-- 4. Alter notifications table
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "imageUrl" VARCHAR(500);
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "deepLink" VARCHAR(255);
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "productId" VARCHAR(36);
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "orderId" VARCHAR(36);
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notifications_productId_fkey') THEN
    ALTER TABLE "notifications" ADD CONSTRAINT "notifications_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notifications_orderId_fkey') THEN
    ALTER TABLE "notifications" ADD CONSTRAINT "notifications_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "notifications_productId_idx" ON "notifications"("productId");
CREATE INDEX IF NOT EXISTS "notifications_orderId_idx" ON "notifications"("orderId");
CREATE INDEX IF NOT EXISTS "notifications_isActive_idx" ON "notifications"("isActive");

-- 5. Alter notification_recipients table
ALTER TABLE "notification_recipients" ALTER COLUMN "adminId" DROP NOT NULL;
ALTER TABLE "notification_recipients" ADD COLUMN IF NOT EXISTS "customerId" VARCHAR(36);
ALTER TABLE "notification_recipients" ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "notification_recipients" ADD COLUMN IF NOT EXISTS "hiddenAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notification_recipients_customerId_fkey') THEN
    ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "notification_recipients_notificationId_customerId_key" ON "notification_recipients"("notificationId", "customerId");
CREATE INDEX IF NOT EXISTS "notification_recipients_customerId_idx" ON "notification_recipients"("customerId");
CREATE INDEX IF NOT EXISTS "notification_recipients_customerId_isRead_idx" ON "notification_recipients"("customerId", "isRead");
CREATE INDEX IF NOT EXISTS "notification_recipients_customerId_createdAt_idx" ON "notification_recipients"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "notification_recipients_customerId_isHidden_idx" ON "notification_recipients"("customerId", "isHidden");

-- 6. Create customer_push_tokens table
CREATE TABLE IF NOT EXISTS "customer_push_tokens" (
  "id" VARCHAR(36) NOT NULL,
  "customerId" VARCHAR(36) NOT NULL,
  "token" VARCHAR(255) NOT NULL,
  "platform" "DevicePlatform" NOT NULL DEFAULT 'ANDROID',
  "deviceId" VARCHAR(128),
  "appVersion" VARCHAR(64),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_push_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_push_tokens_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_push_tokens_token_key" ON "customer_push_tokens"("token");
CREATE INDEX IF NOT EXISTS "customer_push_tokens_customerId_idx" ON "customer_push_tokens"("customerId");
CREATE INDEX IF NOT EXISTS "customer_push_tokens_customerId_isActive_idx" ON "customer_push_tokens"("customerId", "isActive");

-- 7. Create notification_deliveries table
CREATE TABLE IF NOT EXISTS "notification_deliveries" (
  "id" VARCHAR(36) NOT NULL,
  "notificationId" VARCHAR(36) NOT NULL,
  "customerPushTokenId" VARCHAR(36),
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "providerMessageId" VARCHAR(255),
  "ticketId" VARCHAR(255),
  "receiptStatus" VARCHAR(64),
  "errorCode" VARCHAR(64),
  "errorMessage" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notification_deliveries_customerPushTokenId_fkey" FOREIGN KEY ("customerPushTokenId") REFERENCES "customer_push_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "notification_deliveries_notificationId_idx" ON "notification_deliveries"("notificationId");
CREATE INDEX IF NOT EXISTS "notification_deliveries_customerPushTokenId_idx" ON "notification_deliveries"("customerPushTokenId");
CREATE INDEX IF NOT EXISTS "notification_deliveries_status_idx" ON "notification_deliveries"("status");
CREATE INDEX IF NOT EXISTS "notification_deliveries_createdAt_idx" ON "notification_deliveries"("createdAt");

-- 8. Create customer_notification_preferences table
CREATE TABLE IF NOT EXISTS "customer_notification_preferences" (
  "id" VARCHAR(36) NOT NULL,
  "customerId" VARCHAR(36) NOT NULL,
  "newProductsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "promotionsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "orderUpdatesEnabled" BOOLEAN NOT NULL DEFAULT true,
  "supportEnabled" BOOLEAN NOT NULL DEFAULT true,
  "systemEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_notification_preferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_notification_preferences_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_notification_preferences_customerId_key" ON "customer_notification_preferences"("customerId");
CREATE INDEX IF NOT EXISTS "customer_notification_preferences_customerId_idx" ON "customer_notification_preferences"("customerId");
