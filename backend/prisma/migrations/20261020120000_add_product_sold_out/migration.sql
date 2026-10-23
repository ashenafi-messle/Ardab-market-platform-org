-- ==============================================================================
-- Ardab Market - Migration: Add isSoldOut column and indexes to products table
-- ==============================================================================

-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isSoldOut" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_isSoldOut_idx" ON "products"("isSoldOut");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_status_isSoldOut_idx" ON "products"("status", "isSoldOut");
