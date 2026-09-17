-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "CustomerVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_DELIVERY', 'ASSIGNED_TO_TRIP', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'FAILED', 'RETURNED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PENDING', 'FAILED', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: customers
CREATE TABLE IF NOT EXISTS "customers" (
    "id" TEXT NOT NULL,
    "customerCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "profileImageUrl" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Gondar',
    "deliveryZone" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "verificationStatus" "CustomerVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: customer_addresses
CREATE TABLE IF NOT EXISTS "customer_addresses" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Home',
    "recipientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "deliveryZone" TEXT,
    "neighborhood" TEXT,
    "addressLine" TEXT NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable: orders
CREATE TABLE IF NOT EXISTS "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "deliveryZone" TEXT,
    "deliveryAddress" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable: customer_score_events
CREATE TABLE IF NOT EXISTS "customer_score_events" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "referenceId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_score_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable: customer_activities
CREATE TABLE IF NOT EXISTS "customer_activities" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actor" TEXT NOT NULL DEFAULT 'Customer',
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable: customer_reviews
CREATE TABLE IF NOT EXISTS "customer_reviews" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_reviews_pkey" PRIMARY KEY ("id")
);

-- Indexes for customers
CREATE UNIQUE INDEX IF NOT EXISTS "customers_customerCode_key" ON "customers"("customerCode");
CREATE INDEX IF NOT EXISTS "customers_customerCode_idx" ON "customers"("customerCode");
CREATE INDEX IF NOT EXISTS "customers_phone_idx" ON "customers"("phone");
CREATE INDEX IF NOT EXISTS "customers_email_idx" ON "customers"("email");
CREATE INDEX IF NOT EXISTS "customers_city_idx" ON "customers"("city");
CREATE INDEX IF NOT EXISTS "customers_status_idx" ON "customers"("status");
CREATE INDEX IF NOT EXISTS "customers_verificationStatus_idx" ON "customers"("verificationStatus");
CREATE INDEX IF NOT EXISTS "customers_createdAt_idx" ON "customers"("createdAt");
CREATE INDEX IF NOT EXISTS "customers_lastActivityAt_idx" ON "customers"("lastActivityAt");

-- Indexes for customer_addresses
CREATE INDEX IF NOT EXISTS "customer_addresses_customerId_idx" ON "customer_addresses"("customerId");
CREATE INDEX IF NOT EXISTS "customer_addresses_city_idx" ON "customer_addresses"("city");
CREATE INDEX IF NOT EXISTS "customer_addresses_isDefault_idx" ON "customer_addresses"("isDefault");

-- Indexes for orders
CREATE UNIQUE INDEX IF NOT EXISTS "orders_orderNumber_key" ON "orders"("orderNumber");
CREATE INDEX IF NOT EXISTS "orders_customerId_idx" ON "orders"("customerId");
CREATE INDEX IF NOT EXISTS "orders_customerId_status_idx" ON "orders"("customerId", "status");
CREATE INDEX IF NOT EXISTS "orders_customerId_createdAt_idx" ON "orders"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "orders_orderNumber_idx" ON "orders"("orderNumber");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status");
CREATE INDEX IF NOT EXISTS "orders_paymentStatus_idx" ON "orders"("paymentStatus");
CREATE INDEX IF NOT EXISTS "orders_city_idx" ON "orders"("city");

-- Indexes for customer_score_events
CREATE INDEX IF NOT EXISTS "customer_score_events_customerId_idx" ON "customer_score_events"("customerId");
CREATE INDEX IF NOT EXISTS "customer_score_events_customerId_createdAt_idx" ON "customer_score_events"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "customer_score_events_type_idx" ON "customer_score_events"("type");

-- Indexes for customer_activities
CREATE INDEX IF NOT EXISTS "customer_activities_customerId_idx" ON "customer_activities"("customerId");
CREATE INDEX IF NOT EXISTS "customer_activities_customerId_createdAt_idx" ON "customer_activities"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "customer_activities_action_idx" ON "customer_activities"("action");

-- Indexes for customer_reviews
CREATE INDEX IF NOT EXISTS "customer_reviews_customerId_idx" ON "customer_reviews"("customerId");
CREATE INDEX IF NOT EXISTS "customer_reviews_orderId_idx" ON "customer_reviews"("orderId");

-- Foreign Keys
ALTER TABLE "customer_addresses" DROP CONSTRAINT IF EXISTS "customer_addresses_customerId_fkey";
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_customerId_fkey";
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_score_events" DROP CONSTRAINT IF EXISTS "customer_score_events_customerId_fkey";
ALTER TABLE "customer_score_events" ADD CONSTRAINT "customer_score_events_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_activities" DROP CONSTRAINT IF EXISTS "customer_activities_customerId_fkey";
ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_reviews" DROP CONSTRAINT IF EXISTS "customer_reviews_customerId_fkey";
ALTER TABLE "customer_reviews" ADD CONSTRAINT "customer_reviews_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Sequence for Sequential Customer Code Generation (CUST-000001, CUST-000002, etc.)
CREATE SEQUENCE IF NOT EXISTS customer_code_seq START WITH 1 INCREMENT BY 1;
