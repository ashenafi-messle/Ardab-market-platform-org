-- ==============================================================================
-- Ardab Market - Production Migration: Add Chapa Payment System
-- ==============================================================================
-- 1. Extend PaymentStatus enum
-- 2. Create PaymentProvider & PaymentRefundStatus enums
-- 3. Create payments, payment_attempts, payment_webhook_events, payment_audit_logs, payment_refunds
-- ==============================================================================

-- 1. Extend PaymentStatus enum safely
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'SUCCESS';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';

-- 2. Create PaymentProvider Enum
DO $$ BEGIN
  CREATE TYPE "PaymentProvider" AS ENUM ('CHAPA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Create PaymentRefundStatus Enum
DO $$ BEGIN
  CREATE TYPE "PaymentRefundStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. Create payments table
CREATE TABLE IF NOT EXISTS "payments" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'CHAPA',
  "txRef" TEXT NOT NULL,
  "chapaReference" TEXT,
  "amount" DECIMAL(12, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'ETB',
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "paymentMethod" TEXT DEFAULT 'UNKNOWN',
  "checkoutUrl" TEXT,
  "providerStatus" TEXT,
  "providerResponseCode" TEXT,
  "failureReason" TEXT,
  "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processingAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "expiredAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "payments_txRef_key" ON "payments"("txRef");
CREATE INDEX IF NOT EXISTS "payments_orderId_idx" ON "payments"("orderId");
CREATE INDEX IF NOT EXISTS "payments_customerId_idx" ON "payments"("customerId");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments"("status");
CREATE INDEX IF NOT EXISTS "payments_createdAt_idx" ON "payments"("createdAt");
CREATE INDEX IF NOT EXISTS "payments_paidAt_idx" ON "payments"("paidAt");
CREATE INDEX IF NOT EXISTS "payments_provider_idx" ON "payments"("provider");
CREATE INDEX IF NOT EXISTS "payments_txRef_idx" ON "payments"("txRef");

-- 5. Create payment_attempts table
CREATE TABLE IF NOT EXISTS "payment_attempts" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "txRef" TEXT NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(12, 2) NOT NULL,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_attempts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_attempts_txRef_key" ON "payment_attempts"("txRef");
CREATE UNIQUE INDEX IF NOT EXISTS "payment_attempts_paymentId_attemptNumber_key" ON "payment_attempts"("paymentId", "attemptNumber");
CREATE INDEX IF NOT EXISTS "payment_attempts_paymentId_idx" ON "payment_attempts"("paymentId");
CREATE INDEX IF NOT EXISTS "payment_attempts_txRef_idx" ON "payment_attempts"("txRef");

-- 6. Create payment_webhook_events table
CREATE TABLE IF NOT EXISTS "payment_webhook_events" (
  "id" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'CHAPA',
  "eventId" TEXT,
  "txRef" TEXT,
  "eventType" TEXT NOT NULL,
  "payloadHash" TEXT NOT NULL,
  "processingStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "processedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_webhook_events_eventId_key" ON "payment_webhook_events"("eventId");
CREATE INDEX IF NOT EXISTS "payment_webhook_events_txRef_idx" ON "payment_webhook_events"("txRef");
CREATE INDEX IF NOT EXISTS "payment_webhook_events_provider_idx" ON "payment_webhook_events"("provider");
CREATE INDEX IF NOT EXISTS "payment_webhook_events_processingStatus_idx" ON "payment_webhook_events"("processingStatus");
CREATE INDEX IF NOT EXISTS "payment_webhook_events_receivedAt_idx" ON "payment_webhook_events"("receivedAt");
CREATE INDEX IF NOT EXISTS "payment_webhook_events_payloadHash_idx" ON "payment_webhook_events"("payloadHash");

-- 7. Create payment_audit_logs table
CREATE TABLE IF NOT EXISTS "payment_audit_logs" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "previousStatus" "PaymentStatus",
  "newStatus" "PaymentStatus",
  "actorType" TEXT NOT NULL DEFAULT 'SYSTEM',
  "actorId" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payment_audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_audit_logs_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "payment_audit_logs_paymentId_idx" ON "payment_audit_logs"("paymentId");
CREATE INDEX IF NOT EXISTS "payment_audit_logs_event_idx" ON "payment_audit_logs"("event");
CREATE INDEX IF NOT EXISTS "payment_audit_logs_createdAt_idx" ON "payment_audit_logs"("createdAt");

-- 8. Create payment_refunds table
CREATE TABLE IF NOT EXISTS "payment_refunds" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "status" "PaymentRefundStatus" NOT NULL DEFAULT 'REQUESTED',
  "providerReference" TEXT,
  "reason" TEXT,
  "requestedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),

  CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "payment_refunds_paymentId_idx" ON "payment_refunds"("paymentId");
CREATE INDEX IF NOT EXISTS "payment_refunds_status_idx" ON "payment_refunds"("status");
CREATE INDEX IF NOT EXISTS "payment_refunds_createdAt_idx" ON "payment_refunds"("createdAt");
