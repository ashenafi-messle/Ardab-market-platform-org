-- ==============================================================================
-- Ardab Market - Migration: Add Security & Super Admin Management Module
-- ==============================================================================

-- 1. Extend admin_users table with security tracking fields
ALTER TABLE "admin_users" 
ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);

-- 2. Create SecurityEventSeverity Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SecurityEventSeverity') THEN
    CREATE TYPE "SecurityEventSeverity" AS ENUM (
      'INFO',
      'LOW',
      'MEDIUM',
      'HIGH',
      'CRITICAL'
    );
  END IF;
END $$;

-- 3. Create SecurityEventSource Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SecurityEventSource') THEN
    CREATE TYPE "SecurityEventSource" AS ENUM (
      'CUSTOMER_WEB',
      'CUSTOMER_MOBILE',
      'SELLER_WEB',
      'SELLER_MOBILE',
      'SUBADMIN_WEB',
      'SUPERADMIN_WEB',
      'API',
      'AUTH_SERVICE',
      'SYSTEM'
    );
  END IF;
END $$;

-- 4. Create SecurityActorType Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SecurityActorType') THEN
    CREATE TYPE "SecurityActorType" AS ENUM (
      'CUSTOMER',
      'SELLER',
      'SUBADMIN',
      'SUPER_ADMIN',
      'SYSTEM',
      'ANONYMOUS'
    );
  END IF;
END $$;

-- 5. Create SecurityAlertStatus Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SecurityAlertStatus') THEN
    CREATE TYPE "SecurityAlertStatus" AS ENUM (
      'OPEN',
      'ACKNOWLEDGED',
      'INVESTIGATING',
      'RESOLVED',
      'DISMISSED'
    );
  END IF;
END $$;

-- 6. Create IpRuleStatus Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IpRuleStatus') THEN
    CREATE TYPE "IpRuleStatus" AS ENUM (
      'BLOCKED',
      'WHITELISTED'
    );
  END IF;
END $$;

-- 7. Create security_events Table
CREATE TABLE IF NOT EXISTS "security_events" (
  "id" TEXT NOT NULL,
  "eventType" VARCHAR(100) NOT NULL,
  "severity" "SecurityEventSeverity" NOT NULL DEFAULT 'INFO',
  "source" "SecurityEventSource" NOT NULL DEFAULT 'SYSTEM',
  "actorType" "SecurityActorType" NOT NULL DEFAULT 'SYSTEM',
  "actorId" TEXT,
  "actorEmail" VARCHAR(255),
  "targetType" VARCHAR(100),
  "targetId" TEXT,
  "ipAddress" VARCHAR(100),
  "userAgent" TEXT,
  "deviceId" VARCHAR(255),
  "sessionId" TEXT,
  "requestId" VARCHAR(100),
  "endpoint" VARCHAR(255),
  "httpMethod" VARCHAR(20),
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "security_events_eventType_idx" ON "security_events"("eventType");
CREATE INDEX IF NOT EXISTS "security_events_severity_idx" ON "security_events"("severity");
CREATE INDEX IF NOT EXISTS "security_events_source_idx" ON "security_events"("source");
CREATE INDEX IF NOT EXISTS "security_events_actorType_idx" ON "security_events"("actorType");
CREATE INDEX IF NOT EXISTS "security_events_actorId_idx" ON "security_events"("actorId");
CREATE INDEX IF NOT EXISTS "security_events_ipAddress_idx" ON "security_events"("ipAddress");
CREATE INDEX IF NOT EXISTS "security_events_occurredAt_idx" ON "security_events"("occurredAt");
CREATE INDEX IF NOT EXISTS "security_events_requestId_idx" ON "security_events"("requestId");

-- 8. Create security_alerts Table
CREATE TABLE IF NOT EXISTS "security_alerts" (
  "id" TEXT NOT NULL,
  "alertType" VARCHAR(100) NOT NULL,
  "severity" "SecurityEventSeverity" NOT NULL DEFAULT 'MEDIUM',
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT NOT NULL,
  "status" "SecurityAlertStatus" NOT NULL DEFAULT 'OPEN',
  "source" "SecurityEventSource" NOT NULL DEFAULT 'SYSTEM',
  "eventId" TEXT,
  "ipAddress" VARCHAR(100),
  "assignedToId" TEXT,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT,
  "resolutionNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "security_alerts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "security_alerts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "security_events"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "security_alerts_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "security_alerts_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "security_alerts_status_idx" ON "security_alerts"("status");
CREATE INDEX IF NOT EXISTS "security_alerts_severity_idx" ON "security_alerts"("severity");
CREATE INDEX IF NOT EXISTS "security_alerts_detectedAt_idx" ON "security_alerts"("detectedAt");
CREATE INDEX IF NOT EXISTS "security_alerts_assignedToId_idx" ON "security_alerts"("assignedToId");
CREATE INDEX IF NOT EXISTS "security_alerts_resolvedById_idx" ON "security_alerts"("resolvedById");
CREATE INDEX IF NOT EXISTS "security_alerts_ipAddress_idx" ON "security_alerts"("ipAddress");

-- 9. Create security_alert_history Table
CREATE TABLE IF NOT EXISTS "security_alert_history" (
  "id" TEXT NOT NULL,
  "alertId" TEXT NOT NULL,
  "changedById" TEXT,
  "oldStatus" "SecurityAlertStatus" NOT NULL,
  "newStatus" "SecurityAlertStatus" NOT NULL,
  "action" VARCHAR(100) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "security_alert_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "security_alert_history_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "security_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "security_alert_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "security_alert_history_alertId_idx" ON "security_alert_history"("alertId");
CREATE INDEX IF NOT EXISTS "security_alert_history_changedById_idx" ON "security_alert_history"("changedById");
CREATE INDEX IF NOT EXISTS "security_alert_history_createdAt_idx" ON "security_alert_history"("createdAt");

-- 10. Create ip_block_rules Table
CREATE TABLE IF NOT EXISTS "ip_block_rules" (
  "id" TEXT NOT NULL,
  "ipAddress" VARCHAR(100) NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "IpRuleStatus" NOT NULL DEFAULT 'BLOCKED',
  "blockedBy" VARCHAR(150) NOT NULL,
  "createdById" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ip_block_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ip_block_rules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ip_block_rules_ipAddress_key" ON "ip_block_rules"("ipAddress");
CREATE INDEX IF NOT EXISTS "ip_block_rules_status_idx" ON "ip_block_rules"("status");
CREATE INDEX IF NOT EXISTS "ip_block_rules_createdAt_idx" ON "ip_block_rules"("createdAt");

-- 11. Create security_detection_rules Table
CREATE TABLE IF NOT EXISTS "security_detection_rules" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "description" TEXT,
  "eventType" VARCHAR(100) NOT NULL,
  "threshold" INTEGER NOT NULL DEFAULT 5,
  "timeWindowSeconds" INTEGER NOT NULL DEFAULT 600,
  "severity" "SecurityEventSeverity" NOT NULL DEFAULT 'HIGH',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "security_detection_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "security_detection_rules_name_key" ON "security_detection_rules"("name");
CREATE INDEX IF NOT EXISTS "security_detection_rules_eventType_idx" ON "security_detection_rules"("eventType");
CREATE INDEX IF NOT EXISTS "security_detection_rules_isActive_idx" ON "security_detection_rules"("isActive");
