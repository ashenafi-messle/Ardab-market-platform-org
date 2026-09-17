-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SupplierVerificationStatus" AS ENUM ('VERIFIED', 'PENDING', 'REJECTED');

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "accountName" TEXT,
    "accountNumber" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT NOT NULL,
    "category" TEXT,
    "tinNumber" TEXT,
    "address" TEXT NOT NULL,
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "verificationStatus" "SupplierVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "paymentMethodId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_methods_name_idx" ON "payment_methods"("name");

-- CreateIndex
CREATE INDEX "payment_methods_isActive_idx" ON "payment_methods"("isActive");

-- CreateIndex
CREATE INDEX "suppliers_companyName_idx" ON "suppliers"("companyName");

-- CreateIndex
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");

-- CreateIndex
CREATE INDEX "suppliers_phone_idx" ON "suppliers"("phone");

-- CreateIndex
CREATE INDEX "suppliers_email_idx" ON "suppliers"("email");

-- CreateIndex
CREATE INDEX "suppliers_city_idx" ON "suppliers"("city");

-- CreateIndex
CREATE INDEX "suppliers_status_idx" ON "suppliers"("status");

-- CreateIndex
CREATE INDEX "suppliers_verificationStatus_idx" ON "suppliers"("verificationStatus");

-- CreateIndex
CREATE INDEX "suppliers_paymentMethodId_idx" ON "suppliers"("paymentMethodId");

-- CreateIndex
CREATE INDEX "suppliers_createdAt_idx" ON "suppliers"("createdAt");

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
