// ==============================================================================
// Ardab Market - Apply Category Attributes & Logistics Migration
// ==============================================================================
import { prisma } from './src/shared/config/database.js';

async function exec(sql, label) {
  try {
    await prisma.$executeRawUnsafe(sql);
    if (label) console.log(`✓ ${label}`);
  } catch (e) {
    console.error(`Error on "${label}":`, e.message);
    throw e;
  }
}

async function main() {
  console.log('--- Starting Category Attributes & Logistics Migration ---');

  // 1. Create Enums if they do not exist
  await exec(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttributeType') THEN
        CREATE TYPE "AttributeType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'DATE');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttributeStatus') THEN
        CREATE TYPE "AttributeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DEPRECATED');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LogisticsFieldMode') THEN
        CREATE TYPE "LogisticsFieldMode" AS ENUM ('NOT_USED', 'OPTIONAL', 'REQUIRED');
      END IF;
    END $$;
  `, 'Enums verified');

  // 2. Make products.unit and products.weight nullable
  await exec(`ALTER TABLE "products" ALTER COLUMN "unit" DROP NOT NULL;`, 'Product unit dropped NOT NULL');
  await exec(`ALTER TABLE "products" ALTER COLUMN "weight" DROP NOT NULL;`, 'Product weight dropped NOT NULL');

  // 3. Create attribute_definitions table
  await exec(`
    CREATE TABLE IF NOT EXISTS "attribute_definitions" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "type" "AttributeType" NOT NULL,
      "description" TEXT,
      "status" "AttributeStatus" NOT NULL DEFAULT 'ACTIVE',
      "isSystem" BOOLEAN NOT NULL DEFAULT false,
      "unit" TEXT,
      "validationRules" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "attribute_definitions_pkey" PRIMARY KEY ("id")
    );
  `, 'Table attribute_definitions');

  await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "attribute_definitions_slug_key" ON "attribute_definitions"("slug");`, 'Index attribute_definitions_slug_key');
  await exec(`CREATE INDEX IF NOT EXISTS "attribute_definitions_slug_idx" ON "attribute_definitions"("slug");`, 'Index attribute_definitions_slug_idx');
  await exec(`CREATE INDEX IF NOT EXISTS "attribute_definitions_status_idx" ON "attribute_definitions"("status");`, 'Index attribute_definitions_status_idx');
  await exec(`CREATE INDEX IF NOT EXISTS "attribute_definitions_type_idx" ON "attribute_definitions"("type");`, 'Index attribute_definitions_type_idx');

  // 4. Create attribute_options table
  await exec(`
    CREATE TABLE IF NOT EXISTS "attribute_options" (
      "id" TEXT NOT NULL,
      "attributeDefinitionId" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "value" TEXT NOT NULL,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "status" "AttributeStatus" NOT NULL DEFAULT 'ACTIVE',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "attribute_options_pkey" PRIMARY KEY ("id")
    );
  `, 'Table attribute_options');

  await exec(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attribute_options_attributeDefinitionId_fkey') THEN
        ALTER TABLE "attribute_options" 
          ADD CONSTRAINT "attribute_options_attributeDefinitionId_fkey" 
          FOREIGN KEY ("attributeDefinitionId") REFERENCES "attribute_definitions"("id") 
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `, 'FK attribute_options_attributeDefinitionId_fkey');

  await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "attribute_options_attributeDefinitionId_value_key" ON "attribute_options"("attributeDefinitionId", "value");`, 'Index attribute_options unique');
  await exec(`CREATE INDEX IF NOT EXISTS "attribute_options_attributeDefinitionId_idx" ON "attribute_options"("attributeDefinitionId");`, 'Index attribute_options defId');
  await exec(`CREATE INDEX IF NOT EXISTS "attribute_options_attributeDefinitionId_status_sortOrder_idx" ON "attribute_options"("attributeDefinitionId", "status", "sortOrder");`, 'Index attribute_options composite');

  // 5. Create category_attributes table
  await exec(`
    CREATE TABLE IF NOT EXISTS "category_attributes" (
      "id" TEXT NOT NULL,
      "categoryId" TEXT NOT NULL,
      "attributeDefinitionId" TEXT NOT NULL,
      "isRequired" BOOLEAN NOT NULL DEFAULT false,
      "isVisible" BOOLEAN NOT NULL DEFAULT true,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "configuration" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "category_attributes_pkey" PRIMARY KEY ("id")
    );
  `, 'Table category_attributes');

  await exec(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_attributes_categoryId_fkey') THEN
        ALTER TABLE "category_attributes" 
          ADD CONSTRAINT "category_attributes_categoryId_fkey" 
          FOREIGN KEY ("categoryId") REFERENCES "marketplace_categories"("id") 
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_attributes_attributeDefinitionId_fkey') THEN
        ALTER TABLE "category_attributes" 
          ADD CONSTRAINT "category_attributes_attributeDefinitionId_fkey" 
          FOREIGN KEY ("attributeDefinitionId") REFERENCES "attribute_definitions"("id") 
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `, 'FK category_attributes');

  await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "category_attributes_categoryId_attributeDefinitionId_key" ON "category_attributes"("categoryId", "attributeDefinitionId");`, 'Index category_attributes unique');
  await exec(`CREATE INDEX IF NOT EXISTS "category_attributes_categoryId_idx" ON "category_attributes"("categoryId");`, 'Index category_attributes categoryId');
  await exec(`CREATE INDEX IF NOT EXISTS "category_attributes_categoryId_isVisible_sortOrder_idx" ON "category_attributes"("categoryId", "isVisible", "sortOrder");`, 'Index category_attributes sortOrder');
  await exec(`CREATE INDEX IF NOT EXISTS "category_attributes_attributeDefinitionId_idx" ON "category_attributes"("attributeDefinitionId");`, 'Index category_attributes attributeDefinitionId');

  // 6. Create category_logistics_configs table
  await exec(`
    CREATE TABLE IF NOT EXISTS "category_logistics_configs" (
      "id" TEXT NOT NULL,
      "categoryId" TEXT NOT NULL,
      "weightMode" "LogisticsFieldMode" NOT NULL DEFAULT 'NOT_USED',
      "unitOfMeasureMode" "LogisticsFieldMode" NOT NULL DEFAULT 'NOT_USED',
      "defaultUnit" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "category_logistics_configs_pkey" PRIMARY KEY ("id")
    );
  `, 'Table category_logistics_configs');

  await exec(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'category_logistics_configs_categoryId_fkey') THEN
        ALTER TABLE "category_logistics_configs" 
          ADD CONSTRAINT "category_logistics_configs_categoryId_fkey" 
          FOREIGN KEY ("categoryId") REFERENCES "marketplace_categories"("id") 
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `, 'FK category_logistics_configs');

  await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "category_logistics_configs_categoryId_key" ON "category_logistics_configs"("categoryId");`, 'Index category_logistics_configs unique');

  // 7. Create product_attribute_values table
  await exec(`
    CREATE TABLE IF NOT EXISTS "product_attribute_values" (
      "id" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "attributeDefinitionId" TEXT NOT NULL,
      "optionId" TEXT,
      "valueText" TEXT,
      "valueNumber" DECIMAL(14, 4),
      "valueBoolean" BOOLEAN,
      "valueDate" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "product_attribute_values_pkey" PRIMARY KEY ("id")
    );
  `, 'Table product_attribute_values');

  await exec(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_attribute_values_productId_fkey') THEN
        ALTER TABLE "product_attribute_values" 
          ADD CONSTRAINT "product_attribute_values_productId_fkey" 
          FOREIGN KEY ("productId") REFERENCES "products"("id") 
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_attribute_values_attributeDefinitionId_fkey') THEN
        ALTER TABLE "product_attribute_values" 
          ADD CONSTRAINT "product_attribute_values_attributeDefinitionId_fkey" 
          FOREIGN KEY ("attributeDefinitionId") REFERENCES "attribute_definitions"("id") 
          ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_attribute_values_optionId_fkey') THEN
        ALTER TABLE "product_attribute_values" 
          ADD CONSTRAINT "product_attribute_values_optionId_fkey" 
          FOREIGN KEY ("optionId") REFERENCES "attribute_options"("id") 
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `, 'FK product_attribute_values');

  await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "product_attribute_values_productId_attributeDefinitionId_optionId_key" ON "product_attribute_values"("productId", "attributeDefinitionId", "optionId");`, 'Index product_attribute_values unique');
  await exec(`CREATE INDEX IF NOT EXISTS "product_attribute_values_productId_idx" ON "product_attribute_values"("productId");`, 'Index product_attribute_values productId');
  await exec(`CREATE INDEX IF NOT EXISTS "product_attribute_values_attributeDefinitionId_idx" ON "product_attribute_values"("attributeDefinitionId");`, 'Index product_attribute_values attributeDefinitionId');
  await exec(`CREATE INDEX IF NOT EXISTS "product_attribute_values_optionId_idx" ON "product_attribute_values"("optionId");`, 'Index product_attribute_values optionId');

  // 8. Verify data integrity
  const categoryCount = await prisma.marketplaceCategory.count();
  const productCount = await prisma.product.count();
  console.log(`--- Verification Complete ---`);
  console.log(`Marketplace Categories Intact: ${categoryCount}`);
  console.log(`Products Intact: ${productCount}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Migration execution failed:', e);
    process.exit(1);
  });
