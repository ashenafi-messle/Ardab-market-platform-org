-- ==============================================================================
-- Ardab Market - Migration: Add Agent Mobile Auth, OTPs, Sessions & Push Tokens
-- ==============================================================================

-- CreateTable agent_credentials
CREATE TABLE IF NOT EXISTS "agent_credentials" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "passwordHash" TEXT,
    "isActivated" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable agent_email_otps
CREATE TABLE IF NOT EXISTS "agent_email_otps" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_email_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable agent_sessions
CREATE TABLE IF NOT EXISTS "agent_sessions" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable agent_push_tokens
CREATE TABLE IF NOT EXISTS "agent_push_tokens" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "expoPushToken" TEXT NOT NULL,
    "platform" TEXT,
    "deviceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "agent_credentials_agentId_key" ON "agent_credentials"("agentId");
CREATE INDEX IF NOT EXISTS "agent_credentials_agentId_idx" ON "agent_credentials"("agentId");

CREATE INDEX IF NOT EXISTS "agent_email_otps_agentId_purpose_createdAt_idx" ON "agent_email_otps"("agentId", "purpose", "createdAt");
CREATE INDEX IF NOT EXISTS "agent_email_otps_email_purpose_idx" ON "agent_email_otps"("email", "purpose");
CREATE INDEX IF NOT EXISTS "agent_email_otps_expiresAt_idx" ON "agent_email_otps"("expiresAt");

CREATE UNIQUE INDEX IF NOT EXISTS "agent_sessions_refreshTokenHash_key" ON "agent_sessions"("refreshTokenHash");
CREATE INDEX IF NOT EXISTS "agent_sessions_agentId_idx" ON "agent_sessions"("agentId");
CREATE INDEX IF NOT EXISTS "agent_sessions_refreshTokenHash_idx" ON "agent_sessions"("refreshTokenHash");
CREATE INDEX IF NOT EXISTS "agent_sessions_expiresAt_idx" ON "agent_sessions"("expiresAt");
CREATE INDEX IF NOT EXISTS "agent_sessions_status_idx" ON "agent_sessions"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "agent_push_tokens_agentId_expoPushToken_key" ON "agent_push_tokens"("agentId", "expoPushToken");
CREATE INDEX IF NOT EXISTS "agent_push_tokens_agentId_isActive_idx" ON "agent_push_tokens"("agentId", "isActive");
CREATE INDEX IF NOT EXISTS "agent_push_tokens_expoPushToken_idx" ON "agent_push_tokens"("expoPushToken");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "agent_credentials" ADD CONSTRAINT "agent_credentials_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "agent_email_otps" ADD CONSTRAINT "agent_email_otps_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "agent_push_tokens" ADD CONSTRAINT "agent_push_tokens_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

