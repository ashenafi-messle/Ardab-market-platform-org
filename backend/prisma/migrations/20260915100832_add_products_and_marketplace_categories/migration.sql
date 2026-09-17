-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'ARCHIVED');

-- CreateTable
CREATE TABLE "marketplace_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_marketplace_categories" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_marketplace_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sellerId" TEXT NOT NULL,
    "marketplaceCategoryId" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "unit" TEXT NOT NULL,
    "weight" DECIMAL(10,2) NOT NULL,
    "costPrice" DECIMAL(12,2),
    "sellingPrice" DECIMAL(12,2) NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "cityAvailability" TEXT[] DEFAULT ARRAY['All Cities']::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_categories_name_key" ON "marketplace_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_categories_slug_key" ON "marketplace_categories"("slug");

-- CreateIndex
CREATE INDEX "marketplace_categories_name_idx" ON "marketplace_categories"("name");

-- CreateIndex
CREATE INDEX "marketplace_categories_slug_idx" ON "marketplace_categories"("slug");

-- CreateIndex
CREATE INDEX "marketplace_categories_isActive_idx" ON "marketplace_categories"("isActive");

-- CreateIndex
CREATE INDEX "seller_marketplace_categories_sellerId_idx" ON "seller_marketplace_categories"("sellerId");

-- CreateIndex
CREATE INDEX "seller_marketplace_categories_categoryId_idx" ON "seller_marketplace_categories"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "seller_marketplace_categories_sellerId_categoryId_key" ON "seller_marketplace_categories"("sellerId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "products_itemCode_key" ON "products"("itemCode");

-- CreateIndex
CREATE INDEX "products_itemCode_idx" ON "products"("itemCode");

-- CreateIndex
CREATE INDEX "products_sellerId_idx" ON "products"("sellerId");

-- CreateIndex
CREATE INDEX "products_marketplaceCategoryId_idx" ON "products"("marketplaceCategoryId");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "products_createdAt_idx" ON "products"("createdAt");

-- AddForeignKey
ALTER TABLE "seller_marketplace_categories" ADD CONSTRAINT "seller_marketplace_categories_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_marketplace_categories" ADD CONSTRAINT "seller_marketplace_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "marketplace_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_marketplaceCategoryId_fkey" FOREIGN KEY ("marketplaceCategoryId") REFERENCES "marketplace_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create Sequence for Sequential Item Code Generation
CREATE SEQUENCE IF NOT EXISTS product_item_code_seq START WITH 1 INCREMENT BY 1;

