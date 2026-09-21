// ==============================================================================
// Ardab Market - Customer Authentication & Catalog Integration Test Suite
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/shared/config/database.js';

const app = createApp();

test('Customer Web Application Backend Integration Test Suite', async (suite) => {
  let testCustomerId = null;
  let verificationToken = null;
  let customerJwtToken = null;
  const testEmail = `test.customer.${Date.now()}@ardabmarket.com`;
  const testPhone = `+251977${Math.floor(100000 + Math.random() * 900000)}`;

  suite.after(async () => {
    try {
      if (testCustomerId) {
        await prisma.customerActivity.deleteMany({ where: { customerId: testCustomerId } });
        await prisma.customerScoreEvent.deleteMany({ where: { customerId: testCustomerId } });
        await prisma.customer.deleteMany({ where: { id: testCustomerId } });
      }
    } catch {
      // Ignore cleanup error
    }
  });

  await suite.test('1. Customer Registration with Email, Phone, City (Creates Pending Registration)', async (t) => {
    const res = await request(app)
      .post('/api/customer/auth/register')
      .send({
        email: testEmail,
        phone: testPhone,
        city: 'Gondar',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.verificationRequired, true);
    assert.equal(res.body.data.deliveryMethod, 'email_link');
    assert.ok(res.body.data.verificationToken);

    verificationToken = res.body.data.verificationToken;
  });

  await suite.test('2. Customer Email Verification via Token (Creates Permanent Customer)', async (t) => {
    const res = await request(app)
      .post('/api/customer/auth/verify-email')
      .send({
        email: testEmail,
        token: verificationToken || 'SAMPLE_TOKEN',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.verified, true);
    assert.ok(res.body.data.customer);
    assert.equal(res.body.data.customer.verificationStatus, 'VERIFIED');

    testCustomerId = res.body.data.customer.id;
  });

  await suite.test('3. Set Customer Password & Automatic Login', async (t) => {
    const res = await request(app)
      .post('/api/customer/auth/set-password')
      .send({
        email: testEmail,
        password: 'CustomerPass123!',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.customer.id, testCustomerId);

    customerJwtToken = res.body.data.token;
  });

  await suite.test('4. Dual Login (Email OR Phone + Password)', async (t) => {
    // 4.1 Login with Email
    const resEmail = await request(app)
      .post('/api/customer/auth/login')
      .send({
        identifier: testEmail,
        password: 'CustomerPass123!',
      });

    assert.equal(resEmail.status, 200);
    assert.equal(resEmail.body.success, true);
    assert.ok(resEmail.body.data.token);

    // 4.2 Login with Phone Number
    const resPhone = await request(app)
      .post('/api/customer/auth/login')
      .send({
        identifier: testPhone,
        password: 'CustomerPass123!',
      });

    assert.equal(resPhone.status, 200);
    assert.equal(resPhone.body.success, true);
    assert.ok(resPhone.body.data.token);
  });

  await suite.test('5. Customer Profile Retrieval (/api/customer/auth/me)', async (t) => {
    const res = await request(app)
      .get('/api/customer/auth/me')
      .set('Authorization', `Bearer ${customerJwtToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, testCustomerId);
    assert.equal(res.body.data.email, testEmail);
  });

  await suite.test('6. Customer Catalog Endpoints (Products, Categories, Cities)', async (t) => {
    // 6.1 Products list
    const resProducts = await request(app).get('/api/customer/catalog/products');
    assert.equal(resProducts.status, 200);
    assert.ok(resProducts.body.data.items);

    // 6.2 Categories tree
    const resCategories = await request(app).get('/api/customer/catalog/categories/tree');
    assert.equal(resCategories.status, 200);
    assert.ok(Array.isArray(resCategories.body.data));

    // 6.3 Operational cities
    const resCities = await request(app).get('/api/customer/catalog/cities');
    assert.equal(resCities.status, 200);
    assert.ok(Array.isArray(resCities.body.data));
  });

  await suite.test('7. Customer Forgot Password & Reset Password Flow', async (t) => {
    // 7.1 Request password reset
    const resForgot = await request(app)
      .post('/api/customer/auth/forgot-password')
      .send({ email: testEmail });

    assert.equal(resForgot.status, 200);
    assert.equal(resForgot.body.success, true);
    assert.ok(resForgot.body.message);
    assert.equal(resForgot.body.data.deliveryMethod, 'email_link');
    const resetToken = resForgot.body.data.resetToken;
    assert.ok(resetToken, 'Reset token generated in test/dev mode');

    // 7.2 Execute password reset
    const resReset = await request(app)
      .post('/api/customer/auth/reset-password')
      .send({
        token: resetToken,
        email: testEmail,
        password: 'NewCustomerPass456!',
      });

    assert.equal(resReset.status, 200);
    assert.equal(resReset.body.success, true);

    // 7.3 Verify login with new password
    const resNewLogin = await request(app)
      .post('/api/customer/auth/login')
      .send({
        identifier: testEmail,
        password: 'NewCustomerPass456!',
      });

    assert.equal(resNewLogin.status, 200);
    assert.equal(resNewLogin.body.success, true);
    assert.ok(resNewLogin.body.data.token);
  });
});

