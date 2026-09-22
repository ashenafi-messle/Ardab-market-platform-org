// ==============================================================================
// Ardab Market - Non-Destructive Database Performance Indexes
// ==============================================================================
// Safely creates targeted composite indexes directly in PostgreSQL
// without altering tables, column types, or primary keys.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const indexStatements = [
  // 1. Products: Status + Category + CreatedAt (newest sort within category)
  `CREATE INDEX IF NOT EXISTS idx_products_status_category_created
   ON "products" ("status", "marketplaceCategoryId", "createdAt" DESC);`,

  // 2. Products: Status + CreatedAt (all-products newest sort)
  `CREATE INDEX IF NOT EXISTS idx_products_status_created
   ON "products" ("status", "createdAt" DESC);`,

  // 3. Products: Status + Price (price filter and sorting)
  `CREATE INDEX IF NOT EXISTS idx_products_status_price
   ON "products" ("status", "sellingPrice");`,

  // 4. Orders: Customer + PlacedAt (customer order history)
  `CREATE INDEX IF NOT EXISTS idx_orders_customer_placed
   ON "orders" ("customerId", "placedAt" DESC);`,

  // 5. Feedbacks: Product + Status + Visibility + CreatedAt (public product reviews)
  `CREATE INDEX IF NOT EXISTS idx_feedbacks_product_public_reviews
   ON "feedbacks" ("productId", "status", "visibility", "createdAt" DESC);`,

  // 6. Feedbacks: Customer + Type + Status + CreatedAt (customer review dashboard)
  `CREATE INDEX IF NOT EXISTS idx_feedbacks_customer_reviews
   ON "feedbacks" ("customerId", "type", "status", "createdAt" DESC);`,

  // 7. Support Tickets: Customer + LastMessageAt (customer tickets list)
  `CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_lastmessage
   ON "support_tickets" ("customerId", "lastMessageAt" DESC);`,
];

async function applyIndexes() {
  console.log('--- Applying targeted performance indexes ---');
  for (const sql of indexStatements) {
    const idxName = sql.split('INDEX IF NOT EXISTS ')[1].split('\n')[0].trim();
    const startTime = Date.now();
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`✓ Applied ${idxName} (${Date.now() - startTime}ms)`);
    } catch (err) {
      console.error(`✗ Failed to apply ${idxName}:`, err.message);
    }
  }
  await prisma.$disconnect();
  console.log('--- Finished applying performance indexes ---');
}

applyIndexes().catch((err) => {
  console.error('Fatal error applying indexes:', err);
  process.exit(1);
});
