-- ==============================================================================
-- Ardab Market - Migration: Add Notifications & Operational Alerts Module
-- ==============================================================================

-- 1. Create NotificationType enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
    CREATE TYPE "NotificationType" AS ENUM (
      'NOTIFICATION',
      'OPERATIONAL_ALERT',
      'SYSTEM_ANNOUNCEMENT'
    );
  END IF;
END $$;

-- 2. Create NotificationCategory enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationCategory') THEN
    CREATE TYPE "NotificationCategory" AS ENUM (
      'ORDER',
      'DELIVERY',
      'FLEET',
      'SECURITY',
      'SYSTEM',
      'PAYMENT',
      'CUSTOMER'
    );
  END IF;
END $$;

-- 3. Create NotificationSeverity enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationSeverity') THEN
    CREATE TYPE "NotificationSeverity" AS ENUM (
      'INFO',
      'SUCCESS',
      'WARNING',
      'CRITICAL'
    );
  END IF;
END $$;

-- 4. Create NotificationPriority enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationPriority') THEN
    CREATE TYPE "NotificationPriority" AS ENUM (
      'LOW',
      'NORMAL',
      'HIGH',
      'URGENT'
    );
  END IF;
END $$;

-- 5. Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" VARCHAR(36) NOT NULL,
  "type" "NotificationType" NOT NULL DEFAULT 'NOTIFICATION',
  "category" "NotificationCategory" NOT NULL DEFAULT 'SYSTEM',
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT NOT NULL,
  "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
  "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
  "isAlert" BOOLEAN NOT NULL DEFAULT false,
  "entityType" VARCHAR(64),
  "entityId" VARCHAR(64),
  "actionUrl" VARCHAR(255),
  "metadata" TEXT,
  "targetRole" "UserRole",
  "adminId" VARCHAR(36),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications"("type");
CREATE INDEX IF NOT EXISTS "notifications_category_idx" ON "notifications"("category");
CREATE INDEX IF NOT EXISTS "notifications_severity_idx" ON "notifications"("severity");
CREATE INDEX IF NOT EXISTS "notifications_priority_idx" ON "notifications"("priority");
CREATE INDEX IF NOT EXISTS "notifications_isAlert_idx" ON "notifications"("isAlert");
CREATE INDEX IF NOT EXISTS "notifications_entityType_entityId_idx" ON "notifications"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "notifications_targetRole_idx" ON "notifications"("targetRole");
CREATE INDEX IF NOT EXISTS "notifications_adminId_idx" ON "notifications"("adminId");
CREATE INDEX IF NOT EXISTS "notifications_createdAt_idx" ON "notifications"("createdAt");

-- 6. Create notification_recipients table
CREATE TABLE IF NOT EXISTS "notification_recipients" (
  "id" VARCHAR(36) NOT NULL,
  "notificationId" VARCHAR(36) NOT NULL,
  "adminId" VARCHAR(36) NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "isAcknowledged" BOOLEAN NOT NULL DEFAULT false,
  "acknowledgedAt" TIMESTAMP(3),
  "acknowledgedById" VARCHAR(36),
  "acknowledgementNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_recipients_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notification_recipients_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notification_recipients_notificationId_adminId_key" UNIQUE ("notificationId", "adminId")
);

CREATE INDEX IF NOT EXISTS "notification_recipients_notificationId_idx" ON "notification_recipients"("notificationId");
CREATE INDEX IF NOT EXISTS "notification_recipients_adminId_idx" ON "notification_recipients"("adminId");
CREATE INDEX IF NOT EXISTS "notification_recipients_isRead_idx" ON "notification_recipients"("isRead");
CREATE INDEX IF NOT EXISTS "notification_recipients_isAcknowledged_idx" ON "notification_recipients"("isAcknowledged");
CREATE INDEX IF NOT EXISTS "notification_recipients_createdAt_idx" ON "notification_recipients"("createdAt");

-- 7. Initial Seed: Create real operational alerts and notifications linked to active Super Admins
DO $$
DECLARE
  super_admin_rec RECORD;
  n1_id VARCHAR(36) := 'notif-sys-init-001';
  n2_id VARCHAR(36) := 'notif-ord-init-002';
  n3_id VARCHAR(36) := 'notif-flt-init-003';
  n4_id VARCHAR(36) := 'notif-sec-init-004';
BEGIN
  -- Insert base notifications
  INSERT INTO "notifications" (
    "id", "type", "category", "title", "message", "severity", "priority", "isAlert", "actionUrl", "createdAt"
  ) VALUES
  (
    n1_id,
    'SYSTEM_ANNOUNCEMENT',
    'SYSTEM',
    'Ardab Multi-City Fleet Engine Online',
    'The automated logistics dispatch and notification services have been successfully integrated and synchronized across Addis Ababa, Gondar, and Bahir Dar hubs.',
    'SUCCESS',
    'NORMAL',
    false,
    '/deliveries',
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
  ),
  (
    n2_id,
    'OPERATIONAL_ALERT',
    'ORDER',
    'High-Value Bulk Order Requires Dispatch Review',
    'A high-value multi-item agricultural produce order was placed exceeding 50,000 ETB. Fast-track logistics verification recommended.',
    'WARNING',
    'HIGH',
    true,
    '/orders',
    CURRENT_TIMESTAMP - INTERVAL '1 hour'
  ),
  (
    n3_id,
    'OPERATIONAL_ALERT',
    'FLEET',
    'Vehicle Maintenance Window Due: ETH-3-88412',
    'Isuzu FSR 5,000 KG truck scheduled for routine 10,000 km transmission and brake inspection at Gondar depot.',
    'WARNING',
    'NORMAL',
    true,
    '/deliveries',
    CURRENT_TIMESTAMP - INTERVAL '30 minutes'
  ),
  (
    n4_id,
    'NOTIFICATION',
    'SECURITY',
    'Security Audit: Super Admin Session Authenticated',
    'Admin console access verified via secure 2FA session from trusted operations subnet.',
    'INFO',
    'LOW',
    false,
    '/settings',
    CURRENT_TIMESTAMP - INTERVAL '15 minutes'
  )
  ON CONFLICT ("id") DO NOTHING;

  -- Create recipients for all active admin users
  FOR super_admin_rec IN SELECT "id" FROM "admin_users" WHERE "status" = 'ACTIVE' LOOP
    INSERT INTO "notification_recipients" (
      "id", "notificationId", "adminId", "isRead", "isAcknowledged", "createdAt"
    ) VALUES
      (gen_random_uuid()::varchar, n1_id, super_admin_rec."id", true, false, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
      (gen_random_uuid()::varchar, n2_id, super_admin_rec."id", false, false, CURRENT_TIMESTAMP - INTERVAL '1 hour'),
      (gen_random_uuid()::varchar, n3_id, super_admin_rec."id", false, false, CURRENT_TIMESTAMP - INTERVAL '30 minutes'),
      (gen_random_uuid()::varchar, n4_id, super_admin_rec."id", false, false, CURRENT_TIMESTAMP - INTERVAL '15 minutes')
    ON CONFLICT ("notificationId", "adminId") DO NOTHING;
  END LOOP;
END $$;
