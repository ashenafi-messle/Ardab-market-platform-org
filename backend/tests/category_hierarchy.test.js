// ==============================================================================
// Ardab Market - Category Hierarchy & Descendant Filtering Integration Test Suite
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/shared/config/database.js';

const app = createApp();

test('Category Hierarchy & Product Filtering Integration Test Suite', async (suite) => {
  const timestamp = Date.now();
  let testSellerId = null;
  let clothingCatId = null;
  let mensClothingCatId = null;
  let mensShirtsCatId = null;
  let womensClothingCatId = null;
  let womensDressesCatId = null;

  const productIds = [];

  suite.before(async () => {
    // 1. Create a test seller
    const seller = await prisma.supplier.create({
      data: {
        companyName: `Test Supplier Hierarchy ${timestamp}`,
        name: `Supplier Contact ${timestamp}`,
        phone: `+251911${Math.floor(100000 + Math.random() * 900000)}`,
        city: 'Gondar',
        address: 'Kebele 04, Piazza',
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
      },
    });
    testSellerId = seller.id;

    // 2. Create Category Hierarchy:
    // Clothing (root)
    // ├── Men's Clothing (child)
    // │   └── Men's Shirts (grandchild)
    // └── Women's Clothing (child)
    //     └── Women's Dresses (grandchild)

    const clothing = await prisma.marketplaceCategory.create({
      data: {
        name: `Clothing Root ${timestamp}`,
        slug: `clothing-root-${timestamp}`,
        isActive: true,
      },
    });
    clothingCatId = clothing.id;

    const mensClothing = await prisma.marketplaceCategory.create({
      data: {
        name: `Mens Clothing ${timestamp}`,
        slug: `mens-clothing-${timestamp}`,
        parentId: clothingCatId,
        isActive: true,
      },
    });
    mensClothingCatId = mensClothing.id;

    const mensShirts = await prisma.marketplaceCategory.create({
      data: {
        name: `Mens Shirts ${timestamp}`,
        slug: `mens-shirts-${timestamp}`,
        parentId: mensClothingCatId,
        isActive: true,
      },
    });
    mensShirtsCatId = mensShirts.id;

    const womensClothing = await prisma.marketplaceCategory.create({
      data: {
        name: `Womens Clothing ${timestamp}`,
        slug: `womens-clothing-${timestamp}`,
        parentId: clothingCatId,
        isActive: true,
      },
    });
    womensClothingCatId = womensClothing.id;

    const womensDresses = await prisma.marketplaceCategory.create({
      data: {
        name: `Womens Dresses ${timestamp}`,
        slug: `womens-dresses-${timestamp}`,
        parentId: womensClothingCatId,
        isActive: true,
      },
    });
    womensDressesCatId = womensDresses.id;

    // 3. Create Products assigned across the hierarchy:
    // Product A -> Clothing
    // Product B -> Men's Clothing
    // Product C -> Men's Shirts
    // Product D -> Women's Dresses
    const pA = await prisma.product.create({
      data: {
        itemCode: `TEST-A-${timestamp}`,
        name: 'Product A (Direct Clothing)',
        sellingPrice: 500,
        sellerId: testSellerId,
        marketplaceCategoryId: clothingCatId,
        status: 'ACTIVE',
      },
    });
    productIds.push(pA.id);

    const pB = await prisma.product.create({
      data: {
        itemCode: `TEST-B-${timestamp}`,
        name: 'Product B (Mens Clothing)',
        sellingPrice: 750,
        sellerId: testSellerId,
        marketplaceCategoryId: mensClothingCatId,
        status: 'ACTIVE',
      },
    });
    productIds.push(pB.id);

    const pC = await prisma.product.create({
      data: {
        itemCode: `TEST-C-${timestamp}`,
        name: 'Product C (Mens Shirts)',
        sellingPrice: 1200,
        sellerId: testSellerId,
        marketplaceCategoryId: mensShirtsCatId,
        status: 'ACTIVE',
      },
    });
    productIds.push(pC.id);

    const pD = await prisma.product.create({
      data: {
        itemCode: `TEST-D-${timestamp}`,
        name: 'Product D (Womens Dresses)',
        sellingPrice: 1600,
        sellerId: testSellerId,
        marketplaceCategoryId: womensDressesCatId,
        status: 'ACTIVE',
      },
    });
    productIds.push(pD.id);
  });

  suite.after(async () => {
    try {
      // Clean up products
      if (productIds.length > 0) {
        await prisma.product.deleteMany({ where: { id: { in: productIds } } });
      }
      // Clean up categories in reverse hierarchy order
      if (womensDressesCatId) await prisma.marketplaceCategory.deleteMany({ where: { id: womensDressesCatId } });
      if (womensClothingCatId) await prisma.marketplaceCategory.deleteMany({ where: { id: womensClothingCatId } });
      if (mensShirtsCatId) await prisma.marketplaceCategory.deleteMany({ where: { id: mensShirtsCatId } });
      if (mensClothingCatId) await prisma.marketplaceCategory.deleteMany({ where: { id: mensClothingCatId } });
      if (clothingCatId) await prisma.marketplaceCategory.deleteMany({ where: { id: clothingCatId } });
      // Clean up seller
      if (testSellerId) await prisma.supplier.deleteMany({ where: { id: testSellerId } });
    } catch {
      // Ignore cleanup error
    }
  });

  await suite.test('1. Selecting Root Category (Clothing) includes all descendants (A, B, C, D)', async () => {
    const res = await request(app)
      .get(`/api/customer/catalog/products?categoryId=${clothingCatId}`)
      .expect(200);

    assert.equal(res.body.success, true);
    const returnedIds = res.body.data.items.map((p) => p.id);

    assert.ok(returnedIds.includes(productIds[0]), 'Includes Product A (Root Clothing)');
    assert.ok(returnedIds.includes(productIds[1]), 'Includes Product B (Mens Clothing)');
    assert.ok(returnedIds.includes(productIds[2]), 'Includes Product C (Mens Shirts - Grandchild)');
    assert.ok(returnedIds.includes(productIds[3]), 'Includes Product D (Womens Dresses - Grandchild)');
  });

  await suite.test('2. Querying by Category Slug includes all descendants', async () => {
    const res = await request(app)
      .get(`/api/customer/catalog/products?category=clothing-root-${timestamp}`)
      .expect(200);

    assert.equal(res.body.success, true);
    const returnedIds = res.body.data.items.map((p) => p.id);

    assert.ok(returnedIds.includes(productIds[0]));
    assert.ok(returnedIds.includes(productIds[1]));
    assert.ok(returnedIds.includes(productIds[2]));
    assert.ok(returnedIds.includes(productIds[3]));
  });

  await suite.test('3. Selecting Mid-Level Category (Men\'s Clothing) includes B + C, excludes A + D', async () => {
    const res = await request(app)
      .get(`/api/customer/catalog/products?categoryId=${mensClothingCatId}`)
      .expect(200);

    assert.equal(res.body.success, true);
    const returnedIds = res.body.data.items.map((p) => p.id);

    assert.equal(returnedIds.includes(productIds[0]), false, 'Excludes Product A');
    assert.ok(returnedIds.includes(productIds[1]), 'Includes Product B');
    assert.ok(returnedIds.includes(productIds[2]), 'Includes Product C (Mens Shirts)');
    assert.equal(returnedIds.includes(productIds[3]), false, 'Excludes Product D');
  });

  await suite.test('4. Selecting Leaf Category (Men\'s Shirts) includes ONLY C', async () => {
    const res = await request(app)
      .get(`/api/customer/catalog/products?categoryId=${mensShirtsCatId}`)
      .expect(200);

    assert.equal(res.body.success, true);
    const returnedIds = res.body.data.items.map((p) => p.id);

    assert.equal(returnedIds.includes(productIds[0]), false);
    assert.equal(returnedIds.includes(productIds[1]), false);
    assert.ok(returnedIds.includes(productIds[2]), 'Includes Product C');
    assert.equal(returnedIds.includes(productIds[3]), false);
  });

  await suite.test('5. Category filtering combined with Price Range', async () => {
    // Under Clothing (all 4), filter minPrice=1000 -> Should return C (1200) and D (1600)
    const res = await request(app)
      .get(`/api/customer/catalog/products?categoryId=${clothingCatId}&minPrice=1000`)
      .expect(200);

    const returnedIds = res.body.data.items.map((p) => p.id);
    assert.equal(returnedIds.includes(productIds[0]), false); // 500
    assert.equal(returnedIds.includes(productIds[1]), false); // 750
    assert.ok(returnedIds.includes(productIds[2])); // 1200
    assert.ok(returnedIds.includes(productIds[3])); // 1600
  });

  await suite.test('6. Category filtering combined with Server-Side Sorting', async () => {
    // Sort price_asc
    const resAsc = await request(app)
      .get(`/api/customer/catalog/products?categoryId=${clothingCatId}&sort=price_asc`)
      .expect(200);

    const ascItems = resAsc.body.data.items.filter((p) => productIds.includes(p.id));
    for (let i = 0; i < ascItems.length - 1; i++) {
      assert.ok(Number(ascItems[i].sellingPrice) <= Number(ascItems[i + 1].sellingPrice));
    }

    // Sort price_desc
    const resDesc = await request(app)
      .get(`/api/customer/catalog/products?categoryId=${clothingCatId}&sort=price_desc`)
      .expect(200);

    const descItems = resDesc.body.data.items.filter((p) => productIds.includes(p.id));
    for (let i = 0; i < descItems.length - 1; i++) {
      assert.ok(Number(descItems[i].sellingPrice) >= Number(descItems[i + 1].sellingPrice));
    }
  });

  await suite.test('7. Product Details returns full ancestral categoryPath', async () => {
    // Query Product C (Mens Shirts)
    const res = await request(app)
      .get(`/api/customer/catalog/products/${productIds[2]}`)
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.categoryPath));
    assert.equal(res.body.data.categoryPath.length, 3);
    assert.equal(res.body.data.categoryPath[0].id, clothingCatId);
    assert.equal(res.body.data.categoryPath[1].id, mensClothingCatId);
    assert.equal(res.body.data.categoryPath[2].id, mensShirtsCatId);
  });
});
