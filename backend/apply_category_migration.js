import { prisma } from './src/shared/config/database.js';

async function main() {
  console.log('Applying hierarchical columns to marketplace_categories...');
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "marketplace_categories" 
      ADD COLUMN IF NOT EXISTS "parentId" TEXT,
      ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
      ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
  `);
  console.log('Columns added or verified.');

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "marketplace_categories_parentId_idx" ON "marketplace_categories"("parentId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "marketplace_categories_sortOrder_idx" ON "marketplace_categories"("sortOrder");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "marketplace_categories_parentId_isActive_sortOrder_idx" ON "marketplace_categories"("parentId", "isActive", "sortOrder");
  `);
  console.log('Indexes created or verified.');

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'marketplace_categories_parentId_fkey'
      ) THEN
        ALTER TABLE "marketplace_categories" 
          ADD CONSTRAINT "marketplace_categories_parentId_fkey" 
          FOREIGN KEY ("parentId") REFERENCES "marketplace_categories"("id") 
          ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END $$;
  `);
  console.log('Foreign key constraint verified.');

  const count = await prisma.marketplaceCategory.count();
  console.log(`Verified categories table in database! Total records: ${count}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Migration execution failed:', e);
    process.exit(1);
  });
