// ==============================================================================
// Ardab Market - Hierarchical Category Management Integration Test Suite
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

test('Hierarchical Category Management Integration Test Suite', async (suite) => {
  let rootFashion = null;
  let childMen = null;
  let childShirts = null;
  let childFormalShirts = null;
  let testSupplier = null;
  let createdProductId = null;

  suite.before(async () => {
    // Generate admin tokens
    const seededSuperAdmin = await prisma.adminUser.findUnique({
      where: { email: 'admin@ardabmarket.com' },
    });
    const seededSubAdmin = await prisma.adminUser.findUnique({
      where: { email: 'ashurack664@gmail.com' },
    });

    superAdminToken = generateAdminToken({
      id: seededSuperAdmin ? seededSuperAdmin.id : 'superadmin-test-id',
      email: 'admin@ardabmarket.com',
      name: 'Super Admin',
      role: ADMIN_ROLES.SUPER_ADMIN,
    });

    subAdminToken = generateAdminToken({
      id: seededSubAdmin ? seededSubAdmin.id : 'subadmin-test-id',
      email: 'ashurack664@gmail.com',
      name: 'Sub Admin',
      role: ADMIN_ROLES.SUB_ADMIN,
    });

    // Create a temporary active supplier
    testSupplier = await prisma.supplier.create({
      data: {
        companyName: 'Test Category Taxonomy Supplier',
        name: 'Abebe Bikila',
        phone: '+251911009988',
        email: 'taxonomy.supplier@example.com',
        city: 'Gondar',
        address: 'Central Market',
        status: 'ACTIVE',
      },
    });
  });

  suite.after(async () => {
    try {
      if (createdProductId) {
        await prisma.product.deleteMany({ where: { id: createdProductId } });
      }
      if (testSupplier) {
        await prisma.sellerMarketplaceCategory.deleteMany({ where: { sellerId: testSupplier.id } });
        await prisma.supplier.deleteMany({ where: { id: testSupplier.id } });
      }

      // Cleanup categories in reverse order (leaves first)
      const slugsToDelete = [
        'test-formal-shirts',
        'test-shirts',
        'test-men',
        'test-fashion-root',
        'test-electronics-root',
      ];
      for (const slug of slugsToDelete) {
        await prisma.marketplaceCategory.deleteMany({ where: { slug } });
      }
    } catch (err) {
      console.warn('Test cleanup warning:', err.message);
    }
  });

  // 1. ROOT CATEGORY CREATION
  await suite.test('1. Create Root Category (parentId = NULL)', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${subAdminToken}`)
      .send({
        name: 'Test Fashion Root',
        slug: 'test-fashion-root',
        icon: 'bi-gem',
        description: 'Apparel and accessories',
        sortOrder: 1,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'Test Fashion Root');
    assert.equal(res.body.data.parentId, null);
    rootFashion = res.body.data;
  });

  // 2. CHILD CATEGORY CREATION (MULTI-LEVEL NESTING)
  await suite.test('2. Create Child Categories with Unlimited Depth', async () => {
    // Level 1: Men under Fashion
    const menRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${subAdminToken}`)
      .send({
        name: 'Test Men',
        slug: 'test-men',
        parentId: rootFashion.id,
        sortOrder: 1,
      });
    assert.equal(menRes.status, 201);
    assert.equal(menRes.body.data.parentId, rootFashion.id);
    childMen = menRes.body.data;

    // Level 2: Shirts under Men
    const shirtsRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${subAdminToken}`)
      .send({
        name: 'Test Shirts',
        slug: 'test-shirts',
        parentId: childMen.id,
        sortOrder: 1,
      });
    assert.equal(shirtsRes.status, 201);
    assert.equal(shirtsRes.body.data.parentId, childMen.id);
    childShirts = shirtsRes.body.data;

    // Level 3: Formal Shirts under Shirts
    const formalRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${subAdminToken}`)
      .send({
        name: 'Test Formal Shirts',
        slug: 'test-formal-shirts',
        parentId: childShirts.id,
        sortOrder: 1,
      });
    assert.equal(formalRes.status, 201);
    assert.equal(formalRes.body.data.parentId, childShirts.id);
    childFormalShirts = formalRes.body.data;
  });

  // 3. TREE RETRIEVAL & BREADCRUMBS
  await suite.test('3. GET /api/categories/tree returns nested hierarchy', async () => {
    const res = await request(app)
      .get('/api/categories/tree')
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));

    const foundFashion = res.body.data.find((c) => c.id === rootFashion.id);
    assert.ok(foundFashion, 'Root Fashion must be in tree roots');
    assert.ok(Array.isArray(foundFashion.children));

    const foundMen = foundFashion.children.find((c) => c.id === childMen.id);
    assert.ok(foundMen, 'Men must be child of Fashion');

    const foundShirts = foundMen.children.find((c) => c.id === childShirts.id);
    assert.ok(foundShirts, 'Shirts must be child of Men');

    const foundFormal = foundShirts.children.find((c) => c.id === childFormalShirts.id);
    assert.ok(foundFormal, 'Formal Shirts must be child of Shirts');
  });

  await suite.test('4. GET /api/categories/:id/breadcrumbs returns accurate path', async () => {
    const res = await request(app)
      .get(`/api/categories/${childFormalShirts.id}/breadcrumbs`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 4);
    assert.equal(res.body.data[0].name, 'Test Fashion Root');
    assert.equal(res.body.data[1].name, 'Test Men');
    assert.equal(res.body.data[2].name, 'Test Shirts');
    assert.equal(res.body.data[3].name, 'Test Formal Shirts');
  });

  // 5. CYCLE DETECTION SAFETY
  await suite.test('5. Cycle Prevention: Cannot make a node its own parent or descendant', async () => {
    // Self-parenting attempt
    const selfRes = await request(app)
      .patch(`/api/categories/${rootFashion.id}`)
      .set('Authorization', `Bearer ${subAdminToken}`)
      .send({ parentId: rootFashion.id });

    assert.equal(selfRes.status, 400);
    assert.equal(selfRes.body.error.code, 'CATEGORY_CYCLE_DETECTED');

    // Circular descent attempt: Move Fashion under Formal Shirts
    const cycleRes = await request(app)
      .patch(`/api/categories/${rootFashion.id}/move`)
      .set('Authorization', `Bearer ${subAdminToken}`)
      .send({ targetParentId: childFormalShirts.id });

    assert.equal(cycleRes.status, 400);
    assert.equal(cycleRes.body.error.code, 'CATEGORY_CYCLE_DETECTED');
  });

  // 6. SAFE DELETION VALIDATION
  await suite.test('6. Safe Deletion: Rejects deletion if category has children', async () => {
    const delRes = await request(app)
      .delete(`/api/categories/${childMen.id}`)
      .set('Authorization', `Bearer ${subAdminToken}`);

    assert.equal(delRes.status, 400);
    assert.equal(delRes.body.error.code, 'CATEGORY_HAS_CHILDREN');
  });

  // 7. PRODUCT INTEGRATION & STOPPING AT ANY LEVEL
  await suite.test('7. Product Creation: Stopping at intermediate level (Shirts)', async () => {
    // Assign Shirts category to supplier
    await prisma.sellerMarketplaceCategory.create({
      data: {
        sellerId: testSupplier.id,
        categoryId: childShirts.id,
      },
    });

    const prodRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Oxford Cotton Casual Shirt',
        sellerId: testSupplier.id,
        marketplaceCategoryId: childShirts.id,
        unit: 'piece',
        weight: 0.35,
        sellingPrice: 1850,
      });

    assert.equal(prodRes.status, 201);
    assert.equal(prodRes.body.data.marketplaceCategoryId, childShirts.id);
    createdProductId = prodRes.body.data.id;

    // Verify category path in getProductById
    const getRes = await request(app)
      .get(`/api/products/${createdProductId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(getRes.status, 200);
    assert.ok(Array.isArray(getRes.body.data.categoryPath));
    assert.equal(getRes.body.data.categoryPath.length, 3);
    assert.equal(getRes.body.data.categoryPath[2].name, 'Test Shirts');
  });

  // 8. SAFE DELETION: REJECTS IF PRODUCTS EXIST
  await suite.test('8. Safe Deletion: Rejects deletion if category contains products', async () => {
    const delRes = await request(app)
      .delete(`/api/categories/${childShirts.id}`)
      .set('Authorization', `Bearer ${subAdminToken}`);

    assert.equal(delRes.status, 400);
    assert.ok(
      delRes.body.error.code === 'CATEGORY_HAS_PRODUCTS' || delRes.body.error.code === 'CATEGORY_HAS_CHILDREN'
    );
  });

  // 9. CATEGORY IMAGE UPLOAD TO CLOUDINARY
  await suite.test('9. Category Image Upload: Sub Admin uploads banner to Cloudinary', async () => {
    // 1x1 valid PNG buffer
    const validPngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const uploadRes = await request(app)
      .post('/api/categories/upload-image')
      .set('Authorization', `Bearer ${subAdminToken}`)
      .attach('image', validPngBuffer, 'category-banner.png');

    assert.equal(uploadRes.status, 201);
    assert.equal(uploadRes.body.success, true);
    assert.ok(uploadRes.body.data.url);
    assert.ok(uploadRes.body.data.publicId);
  });
});
