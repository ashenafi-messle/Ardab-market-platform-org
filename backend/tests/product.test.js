// ==============================================================================
// Ardab Market - Product & Marketplace Category Integration Test Suite
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/shared/config/database.js';
import { generateAdminToken } from '../src/admin/services/auth.service.js';
import { ADMIN_ROLES } from '../src/admin/constants/adminRoles.js';

const app = createApp();

let superAdminToken = '';
let subAdminToken = '';

test('Product & Marketplace Category Integration Test Suite', async (suite) => {
  let testSupplier = null;
  let testInactiveSupplier = null;
  let testCategory = null;
  let testCategory2 = null;
  let createdProductIds = [];

  suite.before(async () => {
    // Retrieve seeded admins from Neon PostgreSQL with resilience
    let retries = 3;
    let seededSuperAdmin = null;
    let seededSubAdmin = null;
    while (retries > 0) {
      try {
        seededSuperAdmin = await prisma.adminUser.findUnique({
          where: { email: 'admin@ardabmarket.com' },
        });
        seededSubAdmin = await prisma.adminUser.findUnique({
          where: { email: 'ashurack664@gmail.com' },
        });
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    superAdminToken = generateAdminToken({
      id: seededSuperAdmin ? seededSuperAdmin.id : 'df61c5d7-3f2d-40e3-aea6-6b527a6d353a',
      email: 'admin@ardabmarket.com',
      name: seededSuperAdmin ? seededSuperAdmin.name : 'Super Admin',
      role: ADMIN_ROLES.SUPER_ADMIN,
    });

    subAdminToken = generateAdminToken({
      id: seededSubAdmin ? seededSubAdmin.id : 'subadmin-uuid-1',
      email: 'ashurack664@gmail.com',
      name: seededSubAdmin ? seededSubAdmin.name : 'Sub Admin',
      role: ADMIN_ROLES.SUB_ADMIN,
    });
    // Setup test active supplier
    testSupplier = await prisma.supplier.create({
      data: {
        companyName: 'Test Agri Producers Cooperative',
        name: 'Tesfaye Alemu',
        phone: '+251911999888',
        email: 'tesfaye.test@example.com',
        city: 'Bahir Dar',
        address: 'Kebele 04, Bahir Dar',
        status: 'ACTIVE',
        paymentMethods: {
          create: [{ paymentMethod: 'Bank Transfer', accountNumber: '100029384756' }],
        },
      },
    });

    // Setup test inactive supplier
    testInactiveSupplier = await prisma.supplier.create({
      data: {
        companyName: 'Suspended Grain Importers',
        name: 'Almaz Kassa',
        phone: '+251922888777',
        email: 'almaz.test@example.com',
        city: 'Gondar',
        address: 'Arada Subcity, Gondar',
        status: 'SUSPENDED',
        paymentMethods: {
          create: [{ paymentMethod: 'Telebirr', accountNumber: '0922888777' }],
        },
      },
    });

    // Setup test categories
    testCategory = await prisma.marketplaceCategory.upsert({
      where: { slug: 'test-highland-teff' },
      update: { isActive: true },
      create: {
        name: 'Test Highland Teff',
        slug: 'test-highland-teff',
        icon: 'bi-flower1',
        description: 'Premium organic magna teff',
        isActive: true,
      },
    });

    testCategory2 = await prisma.marketplaceCategory.upsert({
      where: { slug: 'test-specialty-coffee' },
      update: { isActive: true },
      create: {
        name: 'Test Specialty Coffee',
        slug: 'test-specialty-coffee',
        icon: 'bi-cup-hot',
        description: 'Single origin washed coffee',
        isActive: true,
      },
    });

    // Assign testCategory to testSupplier
    await prisma.sellerMarketplaceCategory.upsert({
      where: {
        sellerId_categoryId: {
          sellerId: testSupplier.id,
          categoryId: testCategory.id,
        },
      },
      update: {},
      create: {
        sellerId: testSupplier.id,
        categoryId: testCategory.id,
      },
    });
  });

  suite.after(async () => {
    try {
      if (createdProductIds.length > 0) {
        await prisma.product.deleteMany({
          where: { id: { in: createdProductIds } },
        });
      }
      if (testSupplier) {
        await prisma.sellerMarketplaceCategory.deleteMany({
          where: { sellerId: testSupplier.id },
        });
        await prisma.product.deleteMany({
          where: { sellerId: testSupplier.id },
        });
        await prisma.supplier.deleteMany({
          where: { id: testSupplier.id },
        });
      }
      if (testInactiveSupplier) {
        await prisma.supplier.deleteMany({
          where: { id: testInactiveSupplier.id },
        });
      }
      if (testCategory) {
        await prisma.marketplaceCategory.deleteMany({
          where: { id: testCategory.id },
        });
      }
      if (testCategory2) {
        await prisma.marketplaceCategory.deleteMany({
          where: { id: testCategory2.id },
        });
      }
    } catch (err) {
      console.warn('Cleanup warning:', err.message);
    }
  });

  // ============================================================================
  // 1. MARKETPLACE CATEGORIES & SELLER ASSIGNMENTS
  // ============================================================================
  await suite.test('1. Categories & Seller Marketplace Category Assignment', async (t) => {
    await t.test('GET /api/categories lists active marketplace categories', async () => {
      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length > 0);
    });

    await t.test('GET /api/sellers/:sellerId/marketplace-categories returns assigned categories', async () => {
      const res = await request(app)
        .get(`/api/sellers/${testSupplier.id}/marketplace-categories`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      const found = res.body.data.some((cat) => cat.id === testCategory.id);
      assert.ok(found, 'Should include assigned test category');
    });

    await t.test('POST /api/sellers/:sellerId/marketplace-categories assigns new category', async () => {
      const res = await request(app)
        .post(`/api/sellers/${testSupplier.id}/marketplace-categories`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ categoryId: testCategory2.id });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);

      // Verify assignment query
      const listRes = await request(app)
        .get(`/api/sellers/${testSupplier.id}/marketplace-categories`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      assert.ok(listRes.body.data.some((c) => c.id === testCategory2.id));
    });

    await t.test('DELETE /api/sellers/:sellerId/marketplace-categories/:categoryId removes assignment', async () => {
      const res = await request(app)
        .delete(`/api/sellers/${testSupplier.id}/marketplace-categories/${testCategory2.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Verify removal
      const listRes = await request(app)
        .get(`/api/sellers/${testSupplier.id}/marketplace-categories`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      assert.ok(!listRes.body.data.some((c) => c.id === testCategory2.id));
    });
  });

  // ============================================================================
  // 2. PRODUCT CREATION & VALIDATION ENFORCEMENT
  // ============================================================================
  await suite.test('2. Product Creation, Item Code Generation & Relationship Integrity', async (t) => {
    await t.test('POST /api/products fails if itemCode is provided by client', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          itemCode: 'ARDAB-999999',
          name: 'Highland White Teff',
          sellerId: testSupplier.id,
          marketplaceCategoryId: testCategory.id,
          unit: 'quintal',
          weight: 100,
          sellingPrice: 12500,
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(JSON.stringify(res.body.error), /item code/i);
    });

    await t.test('POST /api/products fails if packagingUnit is supplied', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Highland White Teff',
          sellerId: testSupplier.id,
          marketplaceCategoryId: testCategory.id,
          packagingUnit: 'Bag of 50kg',
          unit: 'quintal',
          weight: 100,
          sellingPrice: 12500,
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(JSON.stringify(res.body.error), /packaging unit/i);
    });

    await t.test('POST /api/products fails if seller is inactive/suspended', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Suspended Seller Product',
          sellerId: testInactiveSupplier.id,
          marketplaceCategoryId: testCategory.id,
          unit: 'kg',
          weight: 25,
          sellingPrice: 500,
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(JSON.stringify(res.body.error), /suspended|inactive/i);
    });

    await t.test('POST /api/products fails if category is not assigned to seller', async () => {
      // testCategory2 is currently not assigned to testSupplier
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Unassigned Category Product',
          sellerId: testSupplier.id,
          marketplaceCategoryId: testCategory2.id,
          unit: 'kg',
          weight: 50,
          sellingPrice: 1500,
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(JSON.stringify(res.body.error), /not assigned/i);
    });

    let createdProduct1 = null;
    let createdProduct2 = null;

    await t.test('POST /api/products successfully auto-generates sequential itemCode ARDAB-XXXXXX', async () => {
      const res1 = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Premium Magna Teff Grade 1',
          description: 'Highland harvested white teff grain, cleaned and stone-free',
          sellerId: testSupplier.id,
          marketplaceCategoryId: testCategory.id,
          unit: 'quintal',
          weight: 100,
          costPrice: 9500,
          sellingPrice: 11200,
          status: 'ACTIVE',
          cityAvailability: ['Addis Ababa', 'Bahir Dar'],
        });

      assert.equal(res1.status, 201);
      assert.equal(res1.body.success, true);
      assert.ok(res1.body.data.id);
      assert.match(res1.body.data.itemCode, /^ARDAB-\d{6}$/);
      assert.equal(res1.body.data.sellerId, testSupplier.id);
      assert.equal(res1.body.data.marketplaceCategoryId, testCategory.id);
      assert.equal(res1.body.data.unit, 'quintal');
      assert.equal(res1.body.data.weight, 100);
      assert.equal(res1.body.data.costPrice, 9500);
      assert.equal(res1.body.data.sellingPrice, 11200);
      assert.equal(res1.body.data.status, 'ACTIVE');

      createdProduct1 = res1.body.data;
      createdProductIds.push(createdProduct1.id);

      // Create second product and ensure sequential increment
      const res2 = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Standard Brown Teff',
          description: 'Sergegna brown teff',
          sellerId: testSupplier.id,
          marketplaceCategoryId: testCategory.id,
          unit: 'bag',
          weight: 50,
          costPrice: 4200,
          sellingPrice: 5100,
          status: 'ACTIVE',
        });

      assert.equal(res2.status, 201);
      assert.equal(res2.body.success, true);
      assert.match(res2.body.data.itemCode, /^ARDAB-\d{6}$/);

      createdProduct2 = res2.body.data;
      createdProductIds.push(createdProduct2.id);

      // Verify sequence increment
      const num1 = parseInt(createdProduct1.itemCode.replace('ARDAB-', ''), 10);
      const num2 = parseInt(createdProduct2.itemCode.replace('ARDAB-', ''), 10);
      assert.equal(num2, num1 + 1, 'Product item codes must increment sequentially');
    });

    await t.test('Item code immutability: PATCH /api/products/:id rejects client itemCode modification', async () => {
      const res = await request(app)
        .patch(`/api/products/${createdProduct1.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          itemCode: 'ARDAB-000999',
          name: 'Renamed Teff',
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(JSON.stringify(res.body.error), /immutable/i);
    });

    await t.test('PATCH /api/products/:id rejects packagingUnit modification', async () => {
      const res = await request(app)
        .patch(`/api/products/${createdProduct1.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          packagingUnit: 'Box of 10kg',
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(JSON.stringify(res.body.error), /packaging unit/i);
    });

    await t.test('PATCH /api/products/:id updates price, unit, weight, and details', async () => {
      const res = await request(app)
        .patch(`/api/products/${createdProduct1.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Updated Magna Teff Special Edition',
          sellingPrice: 11950,
          weight: 105,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.name, 'Updated Magna Teff Special Edition');
      assert.equal(res.body.data.sellingPrice, 11950);
      assert.equal(res.body.data.weight, 105);
      // Item code remains unchanged
      assert.equal(res.body.data.itemCode, createdProduct1.itemCode);
    });

    await t.test('PATCH /api/products/:id/status updates status lifecycle', async () => {
      const res = await request(app)
        .patch(`/api/products/${createdProduct1.id}/status`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ status: 'OUT_OF_STOCK' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'OUT_OF_STOCK');
    });

    await t.test('GET /api/products lists and filters by seller, category, and status', async () => {
      const res = await request(app)
        .get(`/api/products?sellerId=${testSupplier.id}&status=OUT_OF_STOCK`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data.products));
      assert.ok(res.body.data.products.some((p) => p.id === createdProduct1.id));
      assert.ok(res.body.data.pagination);
    });

    await t.test('DELETE /api/products/:id archives the product', async () => {
      const res = await request(app)
        .delete(`/api/products/${createdProduct2.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Verify product is now ARCHIVED
      const getRes = await request(app)
        .get(`/api/products/${createdProduct2.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      assert.equal(getRes.body.data.status, 'ARCHIVED');
    });
  });

  // ============================================================================
  // 3. CONCURRENCY SAFETY OF ITEM CODE GENERATION
  // ============================================================================
  await suite.test('3. Concurrency Safety: Atomic sequence generates distinct consecutive item codes', async (t) => {
    await t.test('Concurrent product creations produce unique non-overlapping itemCodes', async () => {
      const parallelCount = 3;
      const promises = [];

      for (let i = 0; i < parallelCount; i++) {
        promises.push(
          request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${superAdminToken}`)
            .send({
              name: `Concurrent Product Batch ${i + 1}`,
              sellerId: testSupplier.id,
              marketplaceCategoryId: testCategory.id,
              unit: 'kg',
              weight: 10 + i,
              sellingPrice: 1000 + i * 50,
              status: 'DRAFT',
            })
        );
      }

      const results = await Promise.all(promises);
      const generatedCodes = [];

      for (const res of results) {
        assert.equal(res.status, 201, `Creation failed: ${JSON.stringify(res.body)}`);
        assert.ok(res.body.data.itemCode);
        generatedCodes.push(res.body.data.itemCode);
        createdProductIds.push(res.body.data.id);
      }

      // Check all codes are strictly distinct
      const uniqueCodes = new Set(generatedCodes);
      assert.equal(uniqueCodes.size, parallelCount, 'All concurrent itemCodes must be unique');

      // Check all match format
      for (const code of generatedCodes) {
        assert.match(code, /^ARDAB-\d{6}$/);
      }
    });
  });
});
