-- ==============================================================================
-- Ardab Market - Migration: Add COD to PaymentProvider & Allow NULL txRef
-- ==============================================================================

-- 1. Add COD to PaymentProvider enum
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'COD';

-- 2. Make txRef nullable on payments table (COD orders do not have Chapa tx_ref)
ALTER TABLE "payments" ALTER COLUMN "txRef" DROP NOT NULL;
