-- ==============================================================================
-- Ardab Market - Migration: Add Customer Mobile Auth Models
-- ==============================================================================

-- AlterTable: Add telegramUserId to customers (backward compatible, unique, optional)
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "telegramUserId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "customers_telegramUserId_key" ON "customers"("telegramUserId");
CREATE INDEX IF NOT EXISTS "customers_telegramUserId_idx" ON "customers"("telegramUserId");

-- CreateTable: customer_mobile_sessions
CREATE TABLE IF NOT EXISTS "customer_mobile_sessions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_mobile_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "customer_mobile_sessions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_mobile_sessions_refreshTokenHash_key" ON "customer_mobile_sessions"("refreshTokenHash");
CREATE INDEX IF NOT EXISTS "customer_mobile_sessions_customerId_idx" ON "customer_mobile_sessions"("customerId");
CREATE INDEX IF NOT EXISTS "customer_mobile_sessions_refreshTokenHash_idx" ON "customer_mobile_sessions"("refreshTokenHash");
CREATE INDEX IF NOT EXISTS "customer_mobile_sessions_expiresAt_idx" ON "customer_mobile_sessions"("expiresAt");
CREATE INDEX IF NOT EXISTS "customer_mobile_sessions_status_idx" ON "customer_mobile_sessions"("status");

-- CreateTable: customer_mobile_otps
CREATE TABLE IF NOT EXISTS "customer_mobile_otps" (
    "id" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Gondar',
    "purpose" "OtpPurpose" NOT NULL DEFAULT 'EMAIL_VERIFICATION',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_mobile_otps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "customer_mobile_otps_target_channel_purpose_idx" ON "customer_mobile_otps"("target", "channel", "purpose");
CREATE INDEX IF NOT EXISTS "customer_mobile_otps_expiresAt_idx" ON "customer_mobile_otps"("expiresAt");
