-- ==============================================================================
-- Ardab Market - Customer Wishlist Items Table
-- ==============================================================================
-- Adds the customer_wishlist_items table for persistent server-side wishlist.
-- Falls back gracefully: if a product is deleted, the row is kept (productId set null).

CREATE TABLE IF NOT EXISTS "customer_wishlist_items" (
  "id"         TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "productId"  TEXT,
  "addedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_wishlist_items_pkey" PRIMARY KEY ("id")
);

-- Prevent duplicates: one product per customer
CREATE UNIQUE INDEX IF NOT EXISTS "customer_wishlist_items_customerId_productId_key"
  ON "customer_wishlist_items"("customerId", "productId");

CREATE INDEX IF NOT EXISTS "customer_wishlist_items_customerId_idx"
  ON "customer_wishlist_items"("customerId");

CREATE INDEX IF NOT EXISTS "customer_wishlist_items_productId_idx"
  ON "customer_wishlist_items"("productId");

CREATE INDEX IF NOT EXISTS "customer_wishlist_items_addedAt_idx"
  ON "customer_wishlist_items"("addedAt");

-- Foreign key to customers (cascade delete so wishlist clears if account is deleted)
ALTER TABLE "customer_wishlist_items"
  ADD CONSTRAINT "customer_wishlist_items_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign key to products (set null so wishlist item is kept if product is removed)
ALTER TABLE "customer_wishlist_items"
  ADD CONSTRAINT "customer_wishlist_items_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
