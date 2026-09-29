import { prisma } from '../src/shared/config/database.js';

async function applyMigration() {
  console.log('--- Applying Notification System DDL Statements ---');

  const statements = [
    // 1. Add new enum values to NotificationType
    `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_PRODUCT'`,
    `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PRODUCT_DISCOUNT'`,
    `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ORDER_PLACED'`,
    `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ORDER_CONFIRMED'`,
    `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_CONFIRMED'`,
    `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ORDER_PROCESSING'`,
    `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ORDER_PACKED'`,
    `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ORDER_OUT_FOR_DELIVERY'`,
    `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ORDER_DELIVERED'`,
    `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ORDER_CANCELLED'`,
    `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SYSTEM'`,
    `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PROMOTION'`,
    `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SUPPORT'`,
    `ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SECURITY'`,

    // 2. Create DevicePlatform enum if not exists
    `DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DevicePlatform') THEN
        CREATE TYPE "DevicePlatform" AS ENUM ('ANDROID', 'IOS', 'WEB');
      END IF;
    END $$;`,

    // 3. Create NotificationDeliveryStatus enum if not exists
    `DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationDeliveryStatus') THEN
        CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'INVALID_TOKEN');
      END IF;
    END $$;`,

    // 4. Alter notifications table
    `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "imageUrl" VARCHAR(500)`,
    `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "deepLink" VARCHAR(255)`,
    `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "productId" VARCHAR(36)`,
    `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "orderId" VARCHAR(36)`,
    `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true`,
    `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,

    `DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notifications_productId_fkey') THEN
        ALTER TABLE "notifications" ADD CONSTRAINT "notifications_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notifications_orderId_fkey') THEN
        ALTER TABLE "notifications" ADD CONSTRAINT "notifications_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;`,

    `CREATE INDEX IF NOT EXISTS "notifications_productId_idx" ON "notifications"("productId")`,
    `CREATE INDEX IF NOT EXISTS "notifications_orderId_idx" ON "notifications"("orderId")`,
    `CREATE INDEX IF NOT EXISTS "notifications_isActive_idx" ON "notifications"("isActive")`,

    // 5. Alter notification_recipients table
    `ALTER TABLE "notification_recipients" ALTER COLUMN "adminId" DROP NOT NULL`,
    `ALTER TABLE "notification_recipients" ADD COLUMN IF NOT EXISTS "customerId" VARCHAR(36)`,
    `ALTER TABLE "notification_recipients" ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "notification_recipients" ADD COLUMN IF NOT EXISTS "hiddenAt" TIMESTAMP(3)`,

    `DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'notification_recipients_customerId_fkey') THEN
        ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;`,

    `CREATE UNIQUE INDEX IF NOT EXISTS "notification_recipients_notificationId_customerId_key" ON "notification_recipients"("notificationId", "customerId")`,
    `CREATE INDEX IF NOT EXISTS "notification_recipients_customerId_idx" ON "notification_recipients"("customerId")`,
    `CREATE INDEX IF NOT EXISTS "notification_recipients_customerId_isRead_idx" ON "notification_recipients"("customerId", "isRead")`,
    `CREATE INDEX IF NOT EXISTS "notification_recipients_customerId_createdAt_idx" ON "notification_recipients"("customerId", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS "notification_recipients_customerId_isHidden_idx" ON "notification_recipients"("customerId", "isHidden")`,

    // 6. Create customer_push_tokens table
    `CREATE TABLE IF NOT EXISTS "customer_push_tokens" (
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
    )`,

    `CREATE UNIQUE INDEX IF NOT EXISTS "customer_push_tokens_token_key" ON "customer_push_tokens"("token")`,
    `CREATE INDEX IF NOT EXISTS "customer_push_tokens_customerId_idx" ON "customer_push_tokens"("customerId")`,
    `CREATE INDEX IF NOT EXISTS "customer_push_tokens_customerId_isActive_idx" ON "customer_push_tokens"("customerId", "isActive")`,

    // 7. Create notification_deliveries table
    `CREATE TABLE IF NOT EXISTS "notification_deliveries" (
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
    )`,

    `CREATE INDEX IF NOT EXISTS "notification_deliveries_notificationId_idx" ON "notification_deliveries"("notificationId")`,
    `CREATE INDEX IF NOT EXISTS "notification_deliveries_customerPushTokenId_idx" ON "notification_deliveries"("customerPushTokenId")`,
    `CREATE INDEX IF NOT EXISTS "notification_deliveries_status_idx" ON "notification_deliveries"("status")`,
    `CREATE INDEX IF NOT EXISTS "notification_deliveries_createdAt_idx" ON "notification_deliveries"("createdAt")`,

    // 8. Create customer_notification_preferences table
    `CREATE TABLE IF NOT EXISTS "customer_notification_preferences" (
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
    )`,

    `CREATE UNIQUE INDEX IF NOT EXISTS "customer_notification_preferences_customerId_key" ON "customer_notification_preferences"("customerId")`,
    `CREATE INDEX IF NOT EXISTS "customer_notification_preferences_customerId_idx" ON "customer_notification_preferences"("customerId")`,
  ];

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await prisma.$executeRawUnsafe(stmt);
      console.log(`[OK] Statement ${i + 1}/${statements.length} executed.`);
    } catch (err) {
      console.error(`[ERROR] Statement ${i + 1}/${statements.length} failed:`, err.message);
      throw err;
    }
  }

  console.log('--- ALL STATEMENTS EXECUTED SUCCESSFULLY! 🚀 ---');

  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('customer_push_tokens', 'notification_deliveries', 'customer_notification_preferences');
  `;
  console.log('Verified newly created tables:', tables);
}

applyMigration()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
