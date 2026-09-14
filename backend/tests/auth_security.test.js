// ==============================================================================
// Extended Admin Authentication & Account Security Integration Tests
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma, disconnectPrisma } from '../src/shared/config/database.js';
import { hashToken, generateRandomToken } from '../src/shared/utils/crypto.js';

const app = createApp();

test('Forgot Password & Account Enumeration Protection', async (t) => {
  await t.test('POST /api/auth/forgot-password returns generic success for valid account', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'admin@ardabmarket.com' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.message.includes('If an account exists'));

    // Verify reset token was generated in database
    const admin = await prisma.adminUser.findUnique({ where: { email: 'admin@ardabmarket.com' } });
    const resetToken = await prisma.passwordResetToken.findFirst({ where: { adminId: admin.id } });
    assert.ok(resetToken);
    assert.ok(resetToken.tokenHash);
  });

  await t.test('POST /api/auth/forgot-password returns identical generic success for non-existent account', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent_account_999@ardabmarket.com' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.message.includes('If an account exists'));
  });

  await t.test('POST /api/auth/forgot-password rejects invalid email format with 400', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'invalid-email-format' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });
});

test('Password Reset Execution Flow', async (t) => {
  const testEmail = `reset_test_${Date.now()}@ardabmarket.com`;
  let testAdmin = null;
  let rawToken = null;

  t.before(async () => {
    testAdmin = await prisma.adminUser.create({
      data: {
        email: testEmail,
        name: 'Reset Tester',
        passwordHash: '$2a$10$FakeHashForTestingOnly123456789012345678901234567890',
        role: 'SUB_ADMIN',
        status: 'ACTIVE',
      },
    });
  });

  t.after(async () => {
    if (testAdmin) {
      await prisma.adminUser.delete({ where: { id: testAdmin.id } }).catch(() => {});
    }
  });

  await t.test('Rejects reset password request with non-matching passwords', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: 'some_dummy_token',
        newPassword: 'NewPassword123!',
        confirmPassword: 'DifferentPassword123!',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('Rejects invalid or fake reset token', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: 'fake_nonexistent_token_string_12345',
        newPassword: 'BrandNewSecurePassword123!',
        confirmPassword: 'BrandNewSecurePassword123!',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_RESET_TOKEN');
  });

  await t.test('Executes valid password reset & invalidates reset token', async () => {
    rawToken = generateRandomToken();
    const tokenHashed = hashToken(rawToken);

    await prisma.passwordResetToken.create({
      data: {
        adminId: testAdmin.id,
        tokenHash: tokenHashed,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: rawToken,
        newPassword: 'BrandNewPassword123!',
        confirmPassword: 'BrandNewPassword123!',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    // Verify token was marked as used
    const updatedToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash: tokenHashed } });
    assert.ok(updatedToken.usedAt);

    // Verify token reuse is rejected
    const reuseRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: rawToken,
        newPassword: 'AnotherPassword123!',
        confirmPassword: 'AnotherPassword123!',
      });

    assert.equal(reuseRes.status, 400);
    assert.equal(reuseRes.body.error.code, 'INVALID_RESET_TOKEN');
  });
});

test('OTP Request and Verification Security', async (t) => {
  const testEmail = 'admin@ardabmarket.com';
  const purpose = 'SECURITY_VERIFICATION';

  await t.test('POST /api/auth/request-otp generates OTP in database', async () => {
    const res = await request(app)
      .post('/api/auth/request-otp')
      .send({ email: testEmail, purpose });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.message.includes('If an account exists'));

    const admin = await prisma.adminUser.findUnique({ where: { email: testEmail } });
    const otpRecord = await prisma.adminOtp.findFirst({
      where: { adminId: admin.id, purpose, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    assert.ok(otpRecord);
    assert.ok(otpRecord.codeHash);
  });

  await t.test('POST /api/auth/verify-otp rejects invalid 6-digit code', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: testEmail, code: '000000', purpose });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_OTP');
  });

  await t.test('POST /api/auth/verify-otp succeeds with valid code', async () => {
    const rawOtpCode = '889900';
    const codeHash = hashToken(rawOtpCode);
    const admin = await prisma.adminUser.findUnique({ where: { email: testEmail } });

    await prisma.adminOtp.create({
      data: {
        adminId: admin.id,
        codeHash,
        purpose: 'LOGIN_VERIFICATION',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: testEmail, code: rawOtpCode, purpose: 'LOGIN_VERIFICATION' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.verified, true);
  });
});

test('Session Revocation Security', async (t) => {
  await t.test('Logout revokes session and blocks subsequent requests', async () => {
    // 1. Login to receive session token
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'admin@ardabmarket.com',
      password: 'admin123',
    });

    assert.equal(loginRes.status, 200);
    const token = loginRes.body.data.token;

    // 2. Verify token grants access to /me
    const meBeforeLogout = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(meBeforeLogout.status, 200);

    // 3. Logout
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(logoutRes.status, 200);

    // 4. Verify token is now revoked and rejected
    const meAfterLogout = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(meAfterLogout.status, 401);
    assert.equal(meAfterLogout.body.error.code, 'SESSION_REVOKED');
  });
});
