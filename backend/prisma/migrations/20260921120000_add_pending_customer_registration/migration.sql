-- ==============================================================================
-- Ardab Market - Migration: Add Pending Customer Registration
-- ==============================================================================

-- CreateTable: pending_customer_registrations
CREATE TABLE IF NOT EXISTS "pending_customer_registrations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Gondar',
    "deliveryZone" TEXT,
    "verificationTokenHash" TEXT NOT NULL,
    "verificationExpiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_customer_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pending_customer_registrations_verificationTokenHash_key" ON "pending_customer_registrations"("verificationTokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pending_customer_registrations_email_idx" ON "pending_customer_registrations"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pending_customer_registrations_phone_idx" ON "pending_customer_registrations"("phone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pending_customer_registrations_verificationTokenHash_idx" ON "pending_customer_registrations"("verificationTokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pending_customer_registrations_verificationExpiresAt_idx" ON "pending_customer_registrations"("verificationExpiresAt");
