-- ==============================================================================
-- Ardab Market - Migration: Add Feedback & Reputation Management Module
-- ==============================================================================

-- 1. Create FeedbackType enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedbackType') THEN
    CREATE TYPE "FeedbackType" AS ENUM (
      'PRODUCT',
      'DELIVERY',
      'PLATFORM',
      'SUPPLIER',
      'ORDER',
      'CUSTOMER_SERVICE'
    );
  END IF;
END $$;

-- 2. Create FeedbackStatus enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedbackStatus') THEN
    CREATE TYPE "FeedbackStatus" AS ENUM (
      'NEW',
      'PENDING',
      'PUBLISHED',
      'UNDER_REVIEW',
      'REVIEWED',
      'RESOLVED',
      'FLAGGED',
      'HIDDEN',
      'REJECTED',
      'ARCHIVED'
    );
  END IF;
END $$;

-- 3. Create FeedbackVisibility enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedbackVisibility') THEN
    CREATE TYPE "FeedbackVisibility" AS ENUM (
      'PUBLIC',
      'PRIVATE',
      'HIDDEN'
    );
  END IF;
END $$;

-- 4. Create FeedbackSource enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedbackSource') THEN
    CREATE TYPE "FeedbackSource" AS ENUM (
      'ORDER',
      'PRODUCT',
      'SELLER',
      'DELIVERY',
      'SUPPORT',
      'PLATFORM'
    );
  END IF;
END $$;

-- 5. Create FeedbackSentiment enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedbackSentiment') THEN
    CREATE TYPE "FeedbackSentiment" AS ENUM (
      'POSITIVE',
      'NEUTRAL',
      'NEGATIVE'
    );
  END IF;
END $$;

-- 6. Create FeedbackResponderType enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedbackResponderType') THEN
    CREATE TYPE "FeedbackResponderType" AS ENUM (
      'SUBADMIN',
      'ADMIN',
      'SELLER',
      'SYSTEM'
    );
  END IF;
END $$;

-- 7. Create FeedbackReportReason enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedbackReportReason') THEN
    CREATE TYPE "FeedbackReportReason" AS ENUM (
      'SPAM',
      'ABUSIVE_LANGUAGE',
      'HARASSMENT',
      'FALSE_INFORMATION',
      'INAPPROPRIATE_CONTENT',
      'DUPLICATE',
      'OTHER'
    );
  END IF;
END $$;

-- 8. Create FeedbackReportStatus enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedbackReportStatus') THEN
    CREATE TYPE "FeedbackReportStatus" AS ENUM (
      'PENDING',
      'REVIEWED',
      'DISMISSED',
      'ACTION_TAKEN'
    );
  END IF;
END $$;

-- 9. Create FeedbackModerationAction enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedbackModerationAction') THEN
    CREATE TYPE "FeedbackModerationAction" AS ENUM (
      'PUBLISH',
      'HIDE',
      'REJECT',
      'RESOLVE',
      'ARCHIVE',
      'RESTORE'
    );
  END IF;
END $$;

-- 10. Create feedback_categories Table
CREATE TABLE IF NOT EXISTS "feedback_categories" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "type" "FeedbackType" NOT NULL DEFAULT 'PLATFORM',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feedback_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "feedback_categories_name_key" ON "feedback_categories"("name");
CREATE INDEX IF NOT EXISTS "feedback_categories_type_idx" ON "feedback_categories"("type");
CREATE INDEX IF NOT EXISTS "feedback_categories_isActive_idx" ON "feedback_categories"("isActive");

-- 11. Create feedbacks Table
CREATE TABLE IF NOT EXISTS "feedbacks" (
  "id" TEXT NOT NULL,
  "customerId" TEXT,
  "authorName" VARCHAR(150) NOT NULL,
  "authorRole" VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER',
  "orderId" TEXT,
  "productId" TEXT,
  "sellerId" TEXT,
  "deliveryId" TEXT,
  "categoryId" TEXT,
  "type" "FeedbackType" NOT NULL DEFAULT 'PLATFORM',
  "source" "FeedbackSource" NOT NULL DEFAULT 'PLATFORM',
  "city" VARCHAR(100) NOT NULL DEFAULT 'Gondar',
  "rating" INTEGER NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "comment" TEXT NOT NULL,
  "targetEntityName" VARCHAR(200),
  "sentiment" "FeedbackSentiment" NOT NULL DEFAULT 'NEUTRAL',
  "status" "FeedbackStatus" NOT NULL DEFAULT 'PUBLISHED',
  "visibility" "FeedbackVisibility" NOT NULL DEFAULT 'PUBLIC',
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "feedbacks_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5)
);

CREATE INDEX IF NOT EXISTS "feedbacks_customerId_idx" ON "feedbacks"("customerId");
CREATE INDEX IF NOT EXISTS "feedbacks_orderId_idx" ON "feedbacks"("orderId");
CREATE INDEX IF NOT EXISTS "feedbacks_productId_idx" ON "feedbacks"("productId");
CREATE INDEX IF NOT EXISTS "feedbacks_sellerId_idx" ON "feedbacks"("sellerId");
CREATE INDEX IF NOT EXISTS "feedbacks_deliveryId_idx" ON "feedbacks"("deliveryId");
CREATE INDEX IF NOT EXISTS "feedbacks_categoryId_idx" ON "feedbacks"("categoryId");
CREATE INDEX IF NOT EXISTS "feedbacks_type_idx" ON "feedbacks"("type");
CREATE INDEX IF NOT EXISTS "feedbacks_source_idx" ON "feedbacks"("source");
CREATE INDEX IF NOT EXISTS "feedbacks_city_idx" ON "feedbacks"("city");
CREATE INDEX IF NOT EXISTS "feedbacks_status_idx" ON "feedbacks"("status");
CREATE INDEX IF NOT EXISTS "feedbacks_visibility_idx" ON "feedbacks"("visibility");
CREATE INDEX IF NOT EXISTS "feedbacks_rating_idx" ON "feedbacks"("rating");
CREATE INDEX IF NOT EXISTS "feedbacks_isVerified_idx" ON "feedbacks"("isVerified");
CREATE INDEX IF NOT EXISTS "feedbacks_createdAt_idx" ON "feedbacks"("createdAt");

-- 12. Create feedback_responses Table
CREATE TABLE IF NOT EXISTS "feedback_responses" (
  "id" TEXT NOT NULL,
  "feedbackId" TEXT NOT NULL,
  "responderId" TEXT,
  "responderType" "FeedbackResponderType" NOT NULL DEFAULT 'SUBADMIN',
  "responderName" VARCHAR(150),
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feedback_responses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "feedback_responses_feedbackId_idx" ON "feedback_responses"("feedbackId");
CREATE INDEX IF NOT EXISTS "feedback_responses_responderId_idx" ON "feedback_responses"("responderId");
CREATE INDEX IF NOT EXISTS "feedback_responses_createdAt_idx" ON "feedback_responses"("createdAt");

-- 13. Create feedback_reports Table
CREATE TABLE IF NOT EXISTS "feedback_reports" (
  "id" TEXT NOT NULL,
  "feedbackId" TEXT NOT NULL,
  "reportedBy" VARCHAR(150),
  "reporterEmail" VARCHAR(255),
  "reason" "FeedbackReportReason" NOT NULL DEFAULT 'OTHER',
  "description" TEXT,
  "status" "FeedbackReportStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "actionTaken" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feedback_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "feedback_reports_feedbackId_idx" ON "feedback_reports"("feedbackId");
CREATE INDEX IF NOT EXISTS "feedback_reports_status_idx" ON "feedback_reports"("status");
CREATE INDEX IF NOT EXISTS "feedback_reports_reviewedById_idx" ON "feedback_reports"("reviewedById");
CREATE INDEX IF NOT EXISTS "feedback_reports_createdAt_idx" ON "feedback_reports"("createdAt");

-- 14. Create feedback_moderation_history Table
CREATE TABLE IF NOT EXISTS "feedback_moderation_history" (
  "id" TEXT NOT NULL,
  "feedbackId" TEXT NOT NULL,
  "moderatorId" TEXT,
  "action" "FeedbackModerationAction" NOT NULL,
  "previousStatus" "FeedbackStatus" NOT NULL,
  "newStatus" "FeedbackStatus" NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feedback_moderation_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "feedback_moderation_history_feedbackId_idx" ON "feedback_moderation_history"("feedbackId");
CREATE INDEX IF NOT EXISTS "feedback_moderation_history_moderatorId_idx" ON "feedback_moderation_history"("moderatorId");
CREATE INDEX IF NOT EXISTS "feedback_moderation_history_createdAt_idx" ON "feedback_moderation_history"("createdAt");

-- 15. Create feedback_status_history Table
CREATE TABLE IF NOT EXISTS "feedback_status_history" (
  "id" TEXT NOT NULL,
  "feedbackId" TEXT NOT NULL,
  "changedById" TEXT,
  "oldStatus" "FeedbackStatus" NOT NULL,
  "newStatus" "FeedbackStatus" NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "feedback_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "feedback_status_history_feedbackId_idx" ON "feedback_status_history"("feedbackId");
CREATE INDEX IF NOT EXISTS "feedback_status_history_changedById_idx" ON "feedback_status_history"("changedById");
CREATE INDEX IF NOT EXISTS "feedback_status_history_createdAt_idx" ON "feedback_status_history"("createdAt");

-- 16. Foreign Key Constraints
ALTER TABLE "feedbacks"
  DROP CONSTRAINT IF EXISTS "feedbacks_customerId_fkey",
  ADD CONSTRAINT "feedbacks_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "feedbacks"
  DROP CONSTRAINT IF EXISTS "feedbacks_orderId_fkey",
  ADD CONSTRAINT "feedbacks_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "feedbacks"
  DROP CONSTRAINT IF EXISTS "feedbacks_productId_fkey",
  ADD CONSTRAINT "feedbacks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "feedbacks"
  DROP CONSTRAINT IF EXISTS "feedbacks_sellerId_fkey",
  ADD CONSTRAINT "feedbacks_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "feedbacks"
  DROP CONSTRAINT IF EXISTS "feedbacks_deliveryId_fkey",
  ADD CONSTRAINT "feedbacks_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "feedbacks"
  DROP CONSTRAINT IF EXISTS "feedbacks_categoryId_fkey",
  ADD CONSTRAINT "feedbacks_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "feedback_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "feedback_responses"
  DROP CONSTRAINT IF EXISTS "feedback_responses_feedbackId_fkey",
  ADD CONSTRAINT "feedback_responses_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedbacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feedback_responses"
  DROP CONSTRAINT IF EXISTS "feedback_responses_responderId_fkey",
  ADD CONSTRAINT "feedback_responses_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "feedback_reports"
  DROP CONSTRAINT IF EXISTS "feedback_reports_feedbackId_fkey",
  ADD CONSTRAINT "feedback_reports_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedbacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feedback_reports"
  DROP CONSTRAINT IF EXISTS "feedback_reports_reviewedById_fkey",
  ADD CONSTRAINT "feedback_reports_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "feedback_moderation_history"
  DROP CONSTRAINT IF EXISTS "feedback_moderation_history_feedbackId_fkey",
  ADD CONSTRAINT "feedback_moderation_history_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedbacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feedback_moderation_history"
  DROP CONSTRAINT IF EXISTS "feedback_moderation_history_moderatorId_fkey",
  ADD CONSTRAINT "feedback_moderation_history_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "feedback_status_history"
  DROP CONSTRAINT IF EXISTS "feedback_status_history_feedbackId_fkey",
  ADD CONSTRAINT "feedback_status_history_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "feedbacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feedback_status_history"
  DROP CONSTRAINT IF EXISTS "feedback_status_history_changedById_fkey",
  ADD CONSTRAINT "feedback_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 17. Seed Standard Feedback Categories
INSERT INTO "feedback_categories" ("id", "name", "description", "type", "isActive", "createdAt", "updatedAt")
VALUES
  ('fb-cat-001', 'Product Quality', 'Customer ratings and feedback regarding commodity freshness, grading, and packaging', 'PRODUCT', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fb-cat-002', 'Delivery Runs', 'Delivery speed, logistics coordination, driver politeness, and vehicle handling', 'DELIVERY', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fb-cat-003', 'Platform & App', 'User experience, order placing flow, notification alerts, and mobile web app responsiveness', 'PLATFORM', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fb-cat-004', 'Supplier Handover', 'Agricultural supplier fulfillment, weighing accuracy, and consignment reliability', 'SUPPLIER', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fb-cat-005', 'Customer Service', 'Support resolution, response times, and subadmin assistance quality', 'CUSTOMER_SERVICE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fb-cat-006', 'Order Experience', 'Overall marketplace order satisfaction, item availability, and settlement', 'ORDER', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
