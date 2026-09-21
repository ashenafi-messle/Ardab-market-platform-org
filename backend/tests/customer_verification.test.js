// ==============================================================================
// Ardab Market - Customer Authentication & Verification Architecture Test Suite
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/shared/config/database.js';

const app = createApp();

test('Customer Authentication & Pending Verification Test Suite (UPDATE 4)', async (suite) => {
  let createdCustomerId = null;
  let testVerificationToken = null;
  let customerJwtToken = null;

  const testEmail = `test.verify.${Date.now()}@ardabmarket.com`;
  const testPhone = `+251911${Math.floor(100000 + Math.random() * 900000)}`;

  suite.after(async () => {
    try {
      if (createdCustomerId) {
        await prisma.customerActivity.deleteMany({ where: { customerId: createdCustomerId } });
        await prisma.customerScoreEvent.deleteMany({ where: { customerId: createdCustomerId } });
        await prisma.customer.deleteMany({ where: { id: createdCustomerId } });
      }
      await prisma.pendingCustomerRegistration.deleteMany({
        where: { email: { contains: 'test.verify.' } },
      });
    } catch {
      // Ignore cleanup error
    }
  });

  await suite.test('TEST 1 & 2: Signup creates pending registration only; permanent customer does NOT exist', async () => {
    const customerCountBefore = await prisma.customer.count({ where: { email: testEmail } });
    assert.equal(customerCountBefore, 0, 'Permanent customer must not exist prior to registration');

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
    assert.ok(res.body.data.verificationToken, 'Verification token returned in test mode');

    testVerificationToken = res.body.data.verificationToken;

    // Verify permanent customer record STILL DOES NOT EXIST
    const customerCountAfter = await prisma.customer.count({ where: { email: testEmail } });
    assert.equal(customerCountAfter, 0, 'Permanent customer record MUST NOT exist before email verification succeeds');

    // Verify PendingCustomerRegistration exists
    const pending = await prisma.pendingCustomerRegistration.findFirst({
      where: { email: testEmail },
    });
    assert.ok(pending, 'PendingCustomerRegistration record must exist');
    assert.equal(pending.consumedAt, null);
    assert.equal(pending.verifiedAt, null);
  });

  await suite.test('TEST 6: Invalid token returns safe error; no customer created', async () => {
    const res = await request(app)
      .post('/api/customer/auth/verify-email')
      .send({
        token: 'INVALID_RANDOM_TOKEN_1234567890',
        email: testEmail,
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);

    const count = await prisma.customer.count({ where: { email: testEmail } });
    assert.equal(count, 0, 'No customer created for invalid token');
  });

  await suite.test('TEST 5: Expired token returns safe error; no customer created', async () => {
    // Manually expire a dummy pending record
    const expiredEmail = `expired.${Date.now()}@ardabmarket.com`;
    const expToken = 'EXPIRED_TOKEN_TEST';
    const { hashToken } = await import('../src/shared/utils/crypto.js');

    await prisma.pendingCustomerRegistration.create({
      data: {
        email: expiredEmail,
        phone: `+251912${Math.floor(100000 + Math.random() * 900000)}`,
        city: 'Gondar',
        verificationTokenHash: hashToken(expToken),
        verificationExpiresAt: new Date(Date.now() - 60000), // in the past
      },
    });

    const res = await request(app)
      .post('/api/customer/auth/verify-email')
      .send({
        token: expToken,
        email: expiredEmail,
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.error.message, /expired/i);

    const count = await prisma.customer.count({ where: { email: expiredEmail } });
    assert.equal(count, 0, 'No customer created for expired token');

    await prisma.pendingCustomerRegistration.deleteMany({ where: { email: expiredEmail } });
  });

  await suite.test('TEST 3: Valid verification link consumes pending registration and creates permanent customer', async () => {
    const res = await request(app)
      .post('/api/customer/auth/verify-email')
      .send({
        token: testVerificationToken,
        email: testEmail,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.verified, true);
    assert.equal(res.body.data.alreadyVerified, false);
    assert.equal(res.body.data.nextStep, 'set_password');
    assert.ok(res.body.data.customer);
    assert.equal(res.body.data.customer.email, testEmail);

    createdCustomerId = res.body.data.customer.id;

    // Verify pending registration was consumed
    const pending = await prisma.pendingCustomerRegistration.findFirst({
      where: { email: testEmail },
    });
    assert.ok(pending.consumedAt, 'consumedAt must be populated');
    assert.ok(pending.verifiedAt, 'verifiedAt must be populated');

    // Verify permanent customer exists in database
    const customer = await prisma.customer.findUnique({
      where: { id: createdCustomerId },
    });
    assert.ok(customer, 'Permanent customer record must now exist');
    assert.equal(customer.verificationStatus, 'VERIFIED');
  });

  await suite.test('TEST 4: Idempotency - Clicking verification link twice does not fail or duplicate customer', async () => {
    const customerCountBefore = await prisma.customer.count({ where: { email: testEmail } });
    assert.equal(customerCountBefore, 1);

    const res = await request(app)
      .post('/api/customer/auth/verify-email')
      .send({
        token: testVerificationToken,
        email: testEmail,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.verified, true);
    assert.equal(res.body.data.alreadyVerified, true);
    assert.equal(res.body.data.nextStep, 'set_password');

    const customerCountAfter = await prisma.customer.count({ where: { email: testEmail } });
    assert.equal(customerCountAfter, 1, 'Duplicate click must NOT create duplicate customer');
  });

  await suite.test('TEST 8: Existing verified email rejected at signup', async () => {
    const res = await request(app)
      .post('/api/customer/auth/register')
      .send({
        email: testEmail,
        phone: `+251913${Math.floor(100000 + Math.random() * 900000)}`,
        city: 'Gondar',
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.match(res.body.error.message, /already exists/i);
  });

  await suite.test('TEST 9 & 12: Resend verification creates new token and invalidates old token', async () => {
    const unverifiedEmail = `unverified.${Date.now()}@ardabmarket.com`;
    const regRes = await request(app)
      .post('/api/customer/auth/register')
      .send({
        email: unverifiedEmail,
        phone: `+251914${Math.floor(100000 + Math.random() * 900000)}`,
        city: 'Gondar',
      });

    assert.equal(regRes.status, 201);
    const firstToken = regRes.body.data.verificationToken;

    // Force updatedAt back 31 seconds to bypass 30s resend cooldown in test
    await prisma.pendingCustomerRegistration.updateMany({
      where: { email: unverifiedEmail },
      data: { updatedAt: new Date(Date.now() - 35000) },
    });

    const resendRes = await request(app)
      .post('/api/customer/auth/resend-verification')
      .send({ email: unverifiedEmail });

    assert.equal(resendRes.status, 200);
    assert.equal(resendRes.body.success, true);
    const secondToken = resendRes.body.data.verificationToken;
    assert.notEqual(firstToken, secondToken, 'New token must differ from old token');

    // Attempting to verify with old token should now fail
    const oldAttempt = await request(app)
      .post('/api/customer/auth/verify-email')
      .send({
        token: firstToken,
        email: unverifiedEmail,
      });
    assert.equal(oldAttempt.status, 400, 'Old token must be invalid after resend');

    // Verifying with second token should succeed
    const newAttempt = await request(app)
      .post('/api/customer/auth/verify-email')
      .send({
        token: secondToken,
        email: unverifiedEmail,
      });
    assert.equal(newAttempt.status, 200, 'New token must successfully verify');

    // Cleanup
    const c = await prisma.customer.findFirst({ where: { email: unverifiedEmail } });
    if (c) {
      await prisma.customerActivity.deleteMany({ where: { customerId: c.id } });
      await prisma.customerScoreEvent.deleteMany({ where: { customerId: c.id } });
      await prisma.customer.deleteMany({ where: { id: c.id } });
    }
    await prisma.pendingCustomerRegistration.deleteMany({ where: { email: unverifiedEmail } });
  });

  await suite.test('TEST 13: Set password after verification and automatically authenticate', async () => {
    const res = await request(app)
      .post('/api/customer/auth/set-password')
      .send({
        email: testEmail,
        password: 'CustomerPass123!',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token, 'Auth JWT token returned upon setting password');
    assert.equal(res.body.data.customer.id, createdCustomerId);

    customerJwtToken = res.body.data.token;

    // Verify customer profile via me endpoint
    const meRes = await request(app)
      .get('/api/customer/auth/me')
      .set('Authorization', `Bearer ${customerJwtToken}`);

    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.data.id, createdCustomerId);
    assert.equal(meRes.body.data.email, testEmail);
  });

  await suite.test('TEST 14: Forgot password remains independent email-link flow', async () => {
    const resForgot = await request(app)
      .post('/api/customer/auth/forgot-password')
      .send({ email: testEmail });

    assert.equal(resForgot.status, 200);
    assert.equal(resForgot.body.success, true);
    assert.equal(resForgot.body.data.deliveryMethod, 'email_link');
    const resetToken = resForgot.body.data.resetToken;
    assert.ok(resetToken);

    // Reset password
    const resReset = await request(app)
      .post('/api/customer/auth/reset-password')
      .send({
        token: resetToken,
        email: testEmail,
        password: 'NewCustomerPass789!',
      });

    assert.equal(resReset.status, 200);
    assert.equal(resReset.body.success, true);

    // Login with new password
    const resLogin = await request(app)
      .post('/api/customer/auth/login')
      .send({
        identifier: testEmail,
        password: 'NewCustomerPass789!',
      });

    assert.equal(resLogin.status, 200);
    assert.equal(resLogin.body.success, true);
    assert.ok(resLogin.body.data.token);
  });
});
