-- ==============================================================================
-- Ardab Market - Migration: Add Agent Management, Referral & Commission System
-- ==============================================================================

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AgentRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'PAYABLE', 'PAID', 'CANCELLED', 'REVERSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "CommissionPolicyType" AS ENUM ('PERCENTAGE', 'FIXED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "attributedAgentId" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "attributedAt" TIMESTAMP(3);

-- CreateTable agents
CREATE TABLE IF NOT EXISTS "agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nationalIdKey" TEXT NOT NULL,
    "nationalIdOriginalName" TEXT,
    "nationalIdMimeType" TEXT,
    "status" "AgentStatus" NOT NULL DEFAULT 'ACTIVE',
    "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "commissionType" "CommissionPolicyType" NOT NULL DEFAULT 'PERCENTAGE',
    "registeredById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable agent_integration_requests
CREATE TABLE IF NOT EXISTS "agent_integration_requests" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" "AgentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_integration_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable customer_agent_relationships
CREATE TABLE IF NOT EXISTS "customer_agent_relationships" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "requestId" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_agent_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable agent_commissions
CREATE TABLE IF NOT EXISTS "agent_commissions" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "baseAmount" DECIMAL(12,2) NOT NULL,
    "rateSnapshot" DECIMAL(5,2) NOT NULL,
    "policyType" "CommissionPolicyType" NOT NULL DEFAULT 'PERCENTAGE',
    "commissionAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "payableAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paymentReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable agent_notifications
CREATE TABLE IF NOT EXISTS "agent_notifications" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'ORDER_ACCEPTED',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_notifications_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "agents_email_key" ON "agents"("email");
CREATE INDEX IF NOT EXISTS "agents_email_idx" ON "agents"("email");
CREATE INDEX IF NOT EXISTS "agents_phone_idx" ON "agents"("phone");
CREATE INDEX IF NOT EXISTS "agents_status_idx" ON "agents"("status");
CREATE INDEX IF NOT EXISTS "agents_createdAt_idx" ON "agents"("createdAt");

CREATE INDEX IF NOT EXISTS "agent_integration_requests_customerId_idx" ON "agent_integration_requests"("customerId");
CREATE INDEX IF NOT EXISTS "agent_integration_requests_agentId_idx" ON "agent_integration_requests"("agentId");
CREATE INDEX IF NOT EXISTS "agent_integration_requests_status_idx" ON "agent_integration_requests"("status");
CREATE INDEX IF NOT EXISTS "agent_integration_requests_customerId_status_idx" ON "agent_integration_requests"("customerId", "status");
CREATE INDEX IF NOT EXISTS "agent_integration_requests_createdAt_idx" ON "agent_integration_requests"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "customer_agent_relationships_customerId_key" ON "customer_agent_relationships"("customerId");
CREATE UNIQUE INDEX IF NOT EXISTS "customer_agent_relationships_requestId_key" ON "customer_agent_relationships"("requestId");
CREATE INDEX IF NOT EXISTS "customer_agent_relationships_customerId_idx" ON "customer_agent_relationships"("customerId");
CREATE INDEX IF NOT EXISTS "customer_agent_relationships_agentId_idx" ON "customer_agent_relationships"("agentId");
CREATE INDEX IF NOT EXISTS "customer_agent_relationships_approvedAt_idx" ON "customer_agent_relationships"("approvedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "agent_commissions_agentId_orderId_key" ON "agent_commissions"("agentId", "orderId");
CREATE INDEX IF NOT EXISTS "agent_commissions_agentId_idx" ON "agent_commissions"("agentId");
CREATE INDEX IF NOT EXISTS "agent_commissions_orderId_idx" ON "agent_commissions"("orderId");
CREATE INDEX IF NOT EXISTS "agent_commissions_status_idx" ON "agent_commissions"("status");
CREATE INDEX IF NOT EXISTS "agent_commissions_createdAt_idx" ON "agent_commissions"("createdAt");

CREATE INDEX IF NOT EXISTS "agent_notifications_agentId_idx" ON "agent_notifications"("agentId");
CREATE INDEX IF NOT EXISTS "agent_notifications_orderId_idx" ON "agent_notifications"("orderId");
CREATE INDEX IF NOT EXISTS "agent_notifications_isRead_idx" ON "agent_notifications"("isRead");
CREATE INDEX IF NOT EXISTS "agent_notifications_createdAt_idx" ON "agent_notifications"("createdAt");

CREATE INDEX IF NOT EXISTS "orders_attributedAgentId_idx" ON "orders"("attributedAgentId");

-- Foreign Keys (with duplicate object protection)
DO $$ BEGIN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_attributedAgentId_fkey" FOREIGN KEY ("attributedAgentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "agents" ADD CONSTRAINT "agents_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "agent_integration_requests" ADD CONSTRAINT "agent_integration_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "agent_integration_requests" ADD CONSTRAINT "agent_integration_requests_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "agent_integration_requests" ADD CONSTRAINT "agent_integration_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "customer_agent_relationships" ADD CONSTRAINT "customer_agent_relationships_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "customer_agent_relationships" ADD CONSTRAINT "customer_agent_relationships_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "customer_agent_relationships" ADD CONSTRAINT "customer_agent_relationships_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "agent_integration_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "customer_agent_relationships" ADD CONSTRAINT "customer_agent_relationships_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "agent_commissions" ADD CONSTRAINT "agent_commissions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "agent_commissions" ADD CONSTRAINT "agent_commissions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "agent_notifications" ADD CONSTRAINT "agent_notifications_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "agent_notifications" ADD CONSTRAINT "agent_notifications_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
