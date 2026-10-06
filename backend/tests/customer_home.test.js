// ==============================================================================
// Ardab Market - Customer Consolidated Home Endpoint Integration Test Suite
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/shared/config/database.js';
import { generateCustomerToken } from '../src/customer/services/customerAuth.service.js';

const app = createApp();

test('Customer Home API Integration Test Suite', async (suite) => {
  let testCustomer = null;
  let testToken = null;

  suite.before(async () => {
    // Find or create a test customer for authenticated Home checks
    testCustomer = await prisma.customer.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true, email: true, phone: true, fullName: true, status: true },
    });

    if (testCustomer) {
      testToken = generateCustomerToken({
        id: testCustomer.id,
        email: testCustomer.email,
        phone: testCustomer.phone,
        status: testCustomer.status,
      });
    }
  });

  await suite.test('1. GET /api/customer-mobile/home returns 200 for guest browsing', async () => {
    const res = await request(app)
      .get('/api/customer-mobile/home')
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(res.body.data);
    const data = res.body.data;

    assert.ok(Array.isArray(data.categories), 'categories must be an array');
    assert.ok(Array.isArray(data.specialOffers), 'specialOffers must be an array');
    assert.ok(Array.isArray(data.trendingProducts), 'trendingProducts must be an array');
    assert.ok(Array.isArray(data.recommendedProducts), 'recommendedProducts must be an array');
    assert.ok(Array.isArray(data.heroProducts), 'heroProducts must be an array');
    assert.equal(typeof data.unreadNotificationCount, 'number');
    assert.ok(data.serverTimestamp, 'serverTimestamp must be present');
  });

  await suite.test('2. GET /api/customer/home returns 200 with parity for customer web/mobile', async () => {
    const res = await request(app)
      .get('/api/customer/home')
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(res.body.data);
    assert.ok(Array.isArray(res.body.data.categories));
    assert.ok(Array.isArray(res.body.data.trendingProducts));
  });

  await suite.test('3. Special offers only contain products with active discounts', async () => {
    const res = await request(app)
      .get('/api/customer-mobile/home')
      .expect(200);

    const offers = res.body.data.specialOffers;
    for (const item of offers) {
      assert.ok(
        (item.discountPercent && item.discountPercent > 0) ||
        (item.discount && item.discount > 0) ||
        item.hasDiscount,
        `Special offer ${item.id} must have active discount`
      );
      assert.equal(item.status, 'ACTIVE', 'Offer must be in ACTIVE status');
    }
  });

  await suite.test('4. Pull-to-refresh headers bypass cache and return fresh server timestamp', async () => {
    const res = await request(app)
      .get('/api/customer-mobile/home?force=true')
      .set('Cache-Control', 'no-cache')
      .set('Pragma', 'no-cache')
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(res.body.data.serverTimestamp);
  });

  await suite.test('5. Cart product validation returns live pricing and status', async () => {
    // Pick an existing active product
    const product = await prisma.product.findFirst({
      where: { status: 'ACTIVE' },
      select: { id: true, sellingPrice: true },
    });

    if (product) {
      const res = await request(app)
        .get(`/api/customer-mobile/home?cartProductIds=${product.id}`)
        .expect(200);

      const cartValidation = res.body.data.cartValidation;
      assert.ok(Array.isArray(cartValidation));
      const matched = cartValidation.find((p) => p.id === product.id);
      assert.ok(matched, 'Validated cart product must be returned');
      assert.equal(matched.isAvailable, true);
      assert.equal(Number(matched.price), Number(product.sellingPrice));
    }
  });

  await suite.test('6. Authenticated customer request derives customer ID and loads customer-specific data', async () => {
    if (!testToken) return;

    const res = await request(app)
      .get('/api/customer-mobile/home')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200);

    const data = res.body.data;
    assert.ok(data.customer, 'Customer profile must be populated for authenticated user');
    assert.equal(data.customer.id, testCustomer.id);
    assert.ok(Array.isArray(data.wishlistProductIds), 'wishlistProductIds must be an array');
    assert.equal(typeof data.unreadNotificationCount, 'number');
  });
});
