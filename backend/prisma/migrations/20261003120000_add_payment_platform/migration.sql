-- ==============================================================================
-- Ardab Market - Migration: Add platform column to payments table
-- ==============================================================================

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "platform" TEXT DEFAULT 'ANDROID';
