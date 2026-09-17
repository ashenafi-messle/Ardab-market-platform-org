// ==============================================================================
// Ardab Market - Product Images & Cloudinary Integration Test Suite
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

// Valid 1x1 pixel image buffers with proper magic bytes
const VALID_JPEG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xff, 0xd9,
]);

const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
]);

test('Product Images & Cloudinary Storage Integration Suite', async (suite) => {
  let testSupplier = null;
  let testCategory = null;
  let testProductId = null;
  let createdProductIds = [];

  suite.before(async () => {
    // Generate auth tokens for testing
    superAdminToken = generateAdminToken({
      id: 'df61c5d7-3f2d-40e3-aea6-6b527a6d353a',
      email: 'admin@ardabmarket.com',
      name: 'Super Admin',
      role: ADMIN_ROLES.SUPER_ADMIN,
    });

    subAdminToken = generateAdminToken({
      id: '984f70c4-f65a-467e-848d-d3343c54e033',
      email: 'subadmin@ardabmarket.com',
      name: 'Sub Admin',
      role: ADMIN_ROLES.SUB_ADMIN,
    });

    // Create active supplier for test
    testSupplier = await prisma.supplier.create({
      data: {
        companyName: 'Image Test Agro Supplies Ltd',
        name: 'Hailemariam Desalegn',
        phone: '+251933445566',
        email: 'haile.img@example.com',
        city: 'Hawassa',
        address: 'Tabor Subcity',
        status: 'ACTIVE',
      },
    });

    // Create marketplace category
    testCategory = await prisma.marketplaceCategory.upsert({
      where: { slug: 'test-pulses-oilseeds' },
      update: { isActive: true },
      create: {
        name: 'Test Pulses & Oilseeds',
        slug: 'test-pulses-oilseeds',
        icon: 'bi-grid',
        isActive: true,
      },
    });

    // Assign category to seller
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
        await prisma.productImage.deleteMany({
          where: { productId: { in: createdProductIds } },
        });
        await prisma.product.deleteMany({
          where: { id: { in: createdProductIds } },
        });
      }
      if (testSupplier) {
        await prisma.sellerMarketplaceCategory.deleteMany({
          where: { sellerId: testSupplier.id },
        });
        await prisma.supplier.deleteMany({
          where: { id: testSupplier.id },
        });
      }
      if (testCategory) {
        await prisma.marketplaceCategory.deleteMany({
          where: { id: testCategory.id },
        });
      }
    } catch (err) {
      console.warn('Image test cleanup warning:', err.message);
    }
  });

  // ============================================================================
  // 1. MULTIPART PRODUCT CREATION WITH IMAGES
  // ============================================================================
  await suite.test('1. Multipart Product Creation with Image Uploads', async (t) => {
    await t.test('POST /api/products creates product with multiple uploaded images', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .field('name', 'Organic Red Kidney Beans')
        .field('description', 'Export-grade cleaned red kidney beans')
        .field('sellerId', testSupplier.id)
        .field('marketplaceCategoryId', testCategory.id)
        .field('unit', 'bag')
        .field('weight', '50')
        .field('costPrice', '2800')
        .field('sellingPrice', '3400')
        .field('status', 'ACTIVE')
        .attach('images', VALID_JPEG_BUFFER, { filename: 'beans1.jpg', contentType: 'image/jpeg' })
        .attach('images', VALID_PNG_BUFFER, { filename: 'beans2.png', contentType: 'image/png' });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.id);
      assert.match(res.body.data.itemCode, /^ARDAB-\d{6}$/);

      // Verify images array
      assert.ok(Array.isArray(res.body.data.images));
      assert.equal(res.body.data.images.length, 2);

      // Check first image is primary
      const firstImg = res.body.data.images[0];
      assert.equal(firstImg.isPrimary, true);
      assert.equal(firstImg.sortOrder, 0);
      assert.ok(firstImg.url);
      assert.ok(firstImg.publicId);
      assert.ok(firstImg.thumbnailUrl);

      // Check second image
      const secondImg = res.body.data.images[1];
      assert.equal(secondImg.isPrimary, false);
      assert.equal(secondImg.sortOrder, 1);

      testProductId = res.body.data.id;
      createdProductIds.push(testProductId);
    });

    await t.test('POST /api/products rejects invalid file extension (.txt)', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .field('name', 'Invalid Image Product')
        .field('sellerId', testSupplier.id)
        .field('marketplaceCategoryId', testCategory.id)
        .field('unit', 'kg')
        .field('weight', '10')
        .field('sellingPrice', '500')
        .attach('images', Buffer.from('plain text file'), { filename: 'malicious.txt', contentType: 'text/plain' });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(JSON.stringify(res.body.error), /unsupported file type|allowed types/i);
    });

    await t.test('POST /api/products rejects spoofed image binary signature', async () => {
      // Named .jpg but contents are plain text (fails magic byte inspection)
      const fakeImageBuffer = Buffer.from('MZ... executable or fake text header');
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .field('name', 'Spoofed Image Product')
        .field('sellerId', testSupplier.id)
        .field('marketplaceCategoryId', testCategory.id)
        .field('unit', 'kg')
        .field('weight', '10')
        .field('sellingPrice', '500')
        .attach('images', fakeImageBuffer, { filename: 'fake.jpg', contentType: 'image/jpeg' });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(JSON.stringify(res.body.error), /invalid or spoofed/i);
    });

    await t.test('POST /api/products rejects oversized file exceeding 5MB limit', async () => {
      const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024, 0xff);
      // Ensure magic bytes are valid JPEG at start
      oversizedBuffer[0] = 0xff;
      oversizedBuffer[1] = 0xd8;
      oversizedBuffer[2] = 0xff;

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .field('name', 'Oversized Product')
        .field('sellerId', testSupplier.id)
        .field('marketplaceCategoryId', testCategory.id)
        .field('unit', 'kg')
        .field('weight', '10')
        .field('sellingPrice', '500')
        .attach('images', oversizedBuffer, { filename: 'huge.jpg', contentType: 'image/jpeg' });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(JSON.stringify(res.body.error), /exceeds maximum allowed limit/i);
    });
  });

  // ============================================================================
  // 2. PRODUCT IMAGE LIFECYCLE MANAGEMENT (ADD, PRIMARY, REORDER, DELETE)
  // ============================================================================
  await suite.test('2. Product Image Lifecycle Operations', async (t) => {
    let addedImageId = null;

    await t.test('POST /api/products/:id/images uploads new image to existing product', async () => {
      const res = await request(app)
        .post(`/api/products/${testProductId}/images`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .attach('image', VALID_PNG_BUFFER, { filename: 'beans3.png', contentType: 'image/png' });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.id);
      assert.equal(res.body.data.productId, testProductId);
      assert.equal(res.body.data.sortOrder, 2);
      assert.equal(res.body.data.isPrimary, false);
      assert.ok(res.body.data.thumbnailUrl);

      addedImageId = res.body.data.id;
    });

    await t.test('PATCH /api/products/:id/images/:imageId sets target image as primary', async () => {
      const res = await request(app)
        .patch(`/api/products/${testProductId}/images/${addedImageId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ isPrimary: true });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.isPrimary, true);

      // Verify in product details that previous primary is now false
      const productRes = await request(app)
        .get(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      const primaryCount = productRes.body.data.images.filter((img) => img.isPrimary).length;
      assert.equal(primaryCount, 1, 'Only one image must be primary at any time');
      assert.equal(productRes.body.data.primaryImage.id, addedImageId);
    });

    await t.test('PATCH /api/products/:id/images/reorder reorders image sortOrder', async () => {
      const productRes = await request(app)
        .get(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      const currentIds = productRes.body.data.images.map((img) => img.id);
      const reversedIds = [...currentIds].reverse();

      const res = await request(app)
        .patch(`/api/products/${testProductId}/images/reorder`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ imageIds: reversedIds });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data[0].id, reversedIds[0]);
      assert.equal(res.body.data[0].sortOrder, 0);
    });

    await t.test('DELETE /api/products/:id/images/:imageId deletes image and promotes next to primary', async () => {
      const res = await request(app)
        .delete(`/api/products/${testProductId}/images/${addedImageId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Check product details
      const productRes = await request(app)
        .get(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(productRes.body.data.images.length, 2);
      assert.ok(!productRes.body.data.images.some((img) => img.id === addedImageId));
      // Primary image was automatically promoted
      assert.ok(productRes.body.data.primaryImage);
      assert.equal(productRes.body.data.primaryImage.isPrimary, true);
    });

    await t.test('DELETE /api/products/:id/images/:imageId fails for non-existent image', async () => {
      const res = await request(app)
        .delete(`/api/products/${testProductId}/images/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });

    await t.test('RBAC: Sub Admin without permission is forbidden from uploading product images', async () => {
      const res = await request(app)
        .post(`/api/products/${testProductId}/images`)
        .set('Authorization', `Bearer ${subAdminToken}`)
        .attach('image', VALID_PNG_BUFFER, { filename: 'unauth.png', contentType: 'image/png' });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });
  });

  // ============================================================================
  // 3. AUDIT TRAIL VERIFICATION FOR PRODUCT & IMAGE ACTIONS
  // ============================================================================
  await suite.test('3. Audit Trail Verification', async (t) => {
    await t.test('Audit log recorded PRODUCT_IMAGE_ADDED and PRODUCT_IMAGE_REMOVED', async () => {
      const logs = await prisma.auditLog.findMany({
        where: {
          entity: 'Product',
          entityId: testProductId,
        },
        orderBy: { timestamp: 'desc' },
      });

      const actions = logs.map((l) => l.action);
      assert.ok(actions.includes('PRODUCT_CREATED'), 'Should have logged PRODUCT_CREATED');
      assert.ok(actions.includes('PRODUCT_IMAGE_ADDED'), 'Should have logged PRODUCT_IMAGE_ADDED');
      assert.ok(actions.includes('PRODUCT_PRIMARY_IMAGE_CHANGED'), 'Should have logged PRODUCT_PRIMARY_IMAGE_CHANGED');
      assert.ok(actions.includes('PRODUCT_IMAGE_REMOVED'), 'Should have logged PRODUCT_IMAGE_REMOVED');
    });
  });
});
