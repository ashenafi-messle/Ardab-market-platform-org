-- ==============================================================================
-- Ardab Market - Migration: Add Customer Support Module
-- ==============================================================================

-- 1. Create SupportTicketStatus enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportTicketStatus') THEN
    CREATE TYPE "SupportTicketStatus" AS ENUM (
      'OPEN',
      'IN_PROGRESS',
      'WAITING_FOR_CUSTOMER',
      'RESOLVED',
      'CLOSED'
    );
  END IF;
END $$;

-- 2. Create SupportTicketPriority enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportTicketPriority') THEN
    CREATE TYPE "SupportTicketPriority" AS ENUM (
      'LOW',
      'NORMAL',
      'HIGH',
      'URGENT'
    );
  END IF;
END $$;

-- 3. Create SupportSenderType enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportSenderType') THEN
    CREATE TYPE "SupportSenderType" AS ENUM (
      'CUSTOMER',
      'SUBADMIN',
      'SYSTEM'
    );
  END IF;
END $$;

-- 4. Create SupportMessageType enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportMessageType') THEN
    CREATE TYPE "SupportMessageType" AS ENUM (
      'MESSAGE',
      'INTERNAL_NOTE',
      'SYSTEM_EVENT'
    );
  END IF;
END $$;

-- 5. Create SupportEmailStatus enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportEmailStatus') THEN
    CREATE TYPE "SupportEmailStatus" AS ENUM (
      'QUEUED',
      'SENDING',
      'SENT',
      'DELIVERED',
      'FAILED'
    );
  END IF;
END $$;

-- 6. Create support_categories table
CREATE TABLE IF NOT EXISTS "support_categories" (
  "id" VARCHAR(36) NOT NULL,
  "name" VARCHAR(64) NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "support_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "support_categories_name_key" ON "support_categories"("name");

-- 7. Create support_tickets table
CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id" VARCHAR(36) NOT NULL,
  "ticketNumber" VARCHAR(64) NOT NULL,
  "customerId" VARCHAR(36) NOT NULL,
  "assignedSubadminId" VARCHAR(36),
  "categoryId" VARCHAR(36),
  "orderId" VARCHAR(36),
  "city" VARCHAR(64) NOT NULL DEFAULT 'Gondar',
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "SupportTicketPriority" NOT NULL DEFAULT 'NORMAL',
  "subject" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "resolutionNotes" TEXT,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastCustomerMessageAt" TIMESTAMP(3),
  "lastAgentMessageAt" TIMESTAMP(3),
  "firstResponseAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "support_tickets_ticketNumber_key" ON "support_tickets"("ticketNumber");
CREATE INDEX IF NOT EXISTS "support_tickets_ticketNumber_idx" ON "support_tickets"("ticketNumber");
CREATE INDEX IF NOT EXISTS "support_tickets_customerId_idx" ON "support_tickets"("customerId");
CREATE INDEX IF NOT EXISTS "support_tickets_customerId_status_idx" ON "support_tickets"("customerId", "status");
CREATE INDEX IF NOT EXISTS "support_tickets_assignedSubadminId_idx" ON "support_tickets"("assignedSubadminId");
CREATE INDEX IF NOT EXISTS "support_tickets_assignedSubadminId_status_idx" ON "support_tickets"("assignedSubadminId", "status");
CREATE INDEX IF NOT EXISTS "support_tickets_categoryId_idx" ON "support_tickets"("categoryId");
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets"("status");
CREATE INDEX IF NOT EXISTS "support_tickets_priority_idx" ON "support_tickets"("priority");
CREATE INDEX IF NOT EXISTS "support_tickets_city_idx" ON "support_tickets"("city");
CREATE INDEX IF NOT EXISTS "support_tickets_lastMessageAt_idx" ON "support_tickets"("lastMessageAt");
CREATE INDEX IF NOT EXISTS "support_tickets_createdAt_idx" ON "support_tickets"("createdAt");

-- 8. Create support_messages table
CREATE TABLE IF NOT EXISTS "support_messages" (
  "id" VARCHAR(36) NOT NULL,
  "ticketId" VARCHAR(36) NOT NULL,
  "senderUserId" VARCHAR(36) NOT NULL,
  "senderType" "SupportSenderType" NOT NULL,
  "messageType" "SupportMessageType" NOT NULL DEFAULT 'MESSAGE',
  "body" TEXT NOT NULL,
  "isInternal" BOOLEAN NOT NULL DEFAULT false,
  "emailStatus" "SupportEmailStatus",
  "emailMessageId" VARCHAR(128),
  "idempotencyKey" VARCHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "support_messages_idempotencyKey_key" ON "support_messages"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "support_messages_ticketId_idx" ON "support_messages"("ticketId");
CREATE INDEX IF NOT EXISTS "support_messages_ticketId_createdAt_idx" ON "support_messages"("ticketId", "createdAt");
CREATE INDEX IF NOT EXISTS "support_messages_senderUserId_idx" ON "support_messages"("senderUserId");
CREATE INDEX IF NOT EXISTS "support_messages_emailStatus_idx" ON "support_messages"("emailStatus");
CREATE INDEX IF NOT EXISTS "support_messages_createdAt_idx" ON "support_messages"("createdAt");

-- 9. Create support_ticket_status_history table
CREATE TABLE IF NOT EXISTS "support_ticket_status_history" (
  "id" VARCHAR(36) NOT NULL,
  "ticketId" VARCHAR(36) NOT NULL,
  "changedById" VARCHAR(36) NOT NULL,
  "oldStatus" "SupportTicketStatus",
  "newStatus" "SupportTicketStatus" NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "support_ticket_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "support_ticket_status_history_ticketId_idx" ON "support_ticket_status_history"("ticketId");
CREATE INDEX IF NOT EXISTS "support_ticket_status_history_changedById_idx" ON "support_ticket_status_history"("changedById");
CREATE INDEX IF NOT EXISTS "support_ticket_status_history_createdAt_idx" ON "support_ticket_status_history"("createdAt");

-- 10. Create support_ticket_assignment_history table
CREATE TABLE IF NOT EXISTS "support_ticket_assignment_history" (
  "id" VARCHAR(36) NOT NULL,
  "ticketId" VARCHAR(36) NOT NULL,
  "assignedFromId" VARCHAR(36),
  "assignedToId" VARCHAR(36),
  "changedById" VARCHAR(36) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "support_ticket_assignment_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "support_ticket_assignment_history_ticketId_idx" ON "support_ticket_assignment_history"("ticketId");
CREATE INDEX IF NOT EXISTS "support_ticket_assignment_history_assignedFromId_idx" ON "support_ticket_assignment_history"("assignedFromId");
CREATE INDEX IF NOT EXISTS "support_ticket_assignment_history_assignedToId_idx" ON "support_ticket_assignment_history"("assignedToId");
CREATE INDEX IF NOT EXISTS "support_ticket_assignment_history_changedById_idx" ON "support_ticket_assignment_history"("changedById");
CREATE INDEX IF NOT EXISTS "support_ticket_assignment_history_createdAt_idx" ON "support_ticket_assignment_history"("createdAt");

-- 11. Create support_email_logs table
CREATE TABLE IF NOT EXISTS "support_email_logs" (
  "id" VARCHAR(36) NOT NULL,
  "ticketId" VARCHAR(36),
  "messageId" VARCHAR(36),
  "recipientEmail" VARCHAR(255) NOT NULL,
  "recipientName" VARCHAR(128),
  "subject" VARCHAR(255) NOT NULL,
  "provider" VARCHAR(64) NOT NULL DEFAULT 'brevo',
  "providerMessageId" VARCHAR(128),
  "status" "SupportEmailStatus" NOT NULL DEFAULT 'QUEUED',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "support_email_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "support_email_logs_ticketId_idx" ON "support_email_logs"("ticketId");
CREATE INDEX IF NOT EXISTS "support_email_logs_messageId_idx" ON "support_email_logs"("messageId");
CREATE INDEX IF NOT EXISTS "support_email_logs_recipientEmail_idx" ON "support_email_logs"("recipientEmail");
CREATE INDEX IF NOT EXISTS "support_email_logs_status_idx" ON "support_email_logs"("status");
CREATE INDEX IF NOT EXISTS "support_email_logs_createdAt_idx" ON "support_email_logs"("createdAt");

-- 12. Foreign Key Constraints
ALTER TABLE "support_tickets"
  DROP CONSTRAINT IF EXISTS "support_tickets_customerId_fkey",
  ADD CONSTRAINT "support_tickets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "support_tickets"
  DROP CONSTRAINT IF EXISTS "support_tickets_assignedSubadminId_fkey",
  ADD CONSTRAINT "support_tickets_assignedSubadminId_fkey" FOREIGN KEY ("assignedSubadminId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_tickets"
  DROP CONSTRAINT IF EXISTS "support_tickets_categoryId_fkey",
  ADD CONSTRAINT "support_tickets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "support_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_tickets"
  DROP CONSTRAINT IF EXISTS "support_tickets_orderId_fkey",
  ADD CONSTRAINT "support_tickets_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_messages"
  DROP CONSTRAINT IF EXISTS "support_messages_ticketId_fkey",
  ADD CONSTRAINT "support_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_ticket_status_history"
  DROP CONSTRAINT IF EXISTS "support_ticket_status_history_ticketId_fkey",
  ADD CONSTRAINT "support_ticket_status_history_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_ticket_status_history"
  DROP CONSTRAINT IF EXISTS "support_ticket_status_history_changedById_fkey",
  ADD CONSTRAINT "support_ticket_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "support_ticket_assignment_history"
  DROP CONSTRAINT IF EXISTS "support_ticket_assignment_history_ticketId_fkey",
  ADD CONSTRAINT "support_ticket_assignment_history_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_ticket_assignment_history"
  DROP CONSTRAINT IF EXISTS "support_ticket_assignment_history_assignedFromId_fkey",
  ADD CONSTRAINT "support_ticket_assignment_history_assignedFromId_fkey" FOREIGN KEY ("assignedFromId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_ticket_assignment_history"
  DROP CONSTRAINT IF EXISTS "support_ticket_assignment_history_assignedToId_fkey",
  ADD CONSTRAINT "support_ticket_assignment_history_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_ticket_assignment_history"
  DROP CONSTRAINT IF EXISTS "support_ticket_assignment_history_changedById_fkey",
  ADD CONSTRAINT "support_ticket_assignment_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "support_email_logs"
  DROP CONSTRAINT IF EXISTS "support_email_logs_ticketId_fkey",
  ADD CONSTRAINT "support_email_logs_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "support_email_logs"
  DROP CONSTRAINT IF EXISTS "support_email_logs_messageId_fkey",
  ADD CONSTRAINT "support_email_logs_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "support_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 13. Seed Standard Categories
INSERT INTO "support_categories" ("id", "name", "description", "isActive", "createdAt", "updatedAt")
VALUES
  ('cat-order-001', 'ORDER', 'Order fulfillment, item discrepancies, and order status questions', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-deliv-002', 'DELIVERY', 'Delivery delays, driver coordination, and drop-off instructions', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-pay-003', 'PAYMENT', 'Telebirr, CBE Birr, and cash payment discrepancies', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-acct-004', 'ACCOUNT', 'Customer login, profile updates, and verification inquiries', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-prod-005', 'PRODUCT', 'Inquiries regarding agricultural produce specs and availability', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-sell-006', 'SELLER', 'Supplier quality, packaging, and commercial seller feedback', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-ref-007', 'REFUND', 'Return and refund requests on damaged or returned consignments', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-tech-008', 'TECHNICAL', 'Platform bugs, connectivity issues, and mobile app support', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-oth-009', 'OTHER', 'General inquiries and unclassified customer questions', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
