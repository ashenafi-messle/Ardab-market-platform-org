// ==============================================================================
// Ardab Market - Customer Mobile Authentication Integration Test Suite
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/shared/config/database.js';

const app = createApp();

test('Customer Mobile Authentication Backend Integration Test Suite', async (suite) => {
  const timestamp = Date.now();
  const testEmail = `mobile.user.${timestamp}@ardabmarket.com`;
  const testPhone = `+251912${String(timestamp).slice(-6)}`;
  const testPassword = 'SecurePassword123!';

  let emailOtp = null;
  let emailVerificationToken = null;
  let telegramOtp = null;
  let telegramVerificationToken = null;
  let createdEmailCustomerId = null;
  let createdTelegramCustomerId = null;
  let activeAccessToken = null;
  let activeRefreshToken = null;

  suite.after(async () => {
    try {
      // Clean up test customers & related mobile sessions/otps
      const customerIds = [createdEmailCustomerId, createdTelegramCustomerId].filter(Boolean);
      for (const id of customerIds) {
        await prisma.customerMobileSession.deleteMany({ where: { customerId: id } });
        await prisma.customer.deleteMany({ where: { id } });
      }
      await prisma.customerMobileOtp.deleteMany({
        where: {
          target: { in: [testEmail.toLowerCase(), testPhone] },
        },
      });
    } catch (err) {
      console.warn('Test cleanup warning:', err.message);
    }
  });

  // ----------------------------------------------------------------------------
  // 1. REGISTRATION OPTION A: EMAIL OTP
  // ----------------------------------------------------------------------------

  await suite.test('1.1 Should reject email registration start with invalid email', async () => {
    const res = await request(app)
      .post('/api/customer-mobile/auth/register/email/start')
      .send({ email: 'not-an-email', city: 'Addis Ababa' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  await suite.test('1.2 Should send 6-digit OTP for valid email registration', async () => {
    const res = await request(app)
      .post('/api/customer-mobile/auth/register/email/start')
      .send({ email: testEmail, city: 'Addis Ababa' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.code, 'OTP_SENT');
    assert.ok(res.body.data.devOtp, 'Should include devOtp in test environment');
    assert.equal(res.body.data.devOtp.length, 6);

    emailOtp = res.body.data.devOtp;
  });

  await suite.test('1.3 Should reject incorrect email OTP with remaining attempts', async () => {
    const res = await request(app)
      .post('/api/customer-mobile/auth/register/email/verify')
      .send({ email: testEmail, otp: '000000' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'INVALID_OTP');
  });

  await suite.test('1.4 Should successfully verify correct email OTP and return verification ticket', async () => {
    const res = await request(app)
      .post('/api/customer-mobile/auth/register/email/verify')
      .send({ email: testEmail, otp: emailOtp });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.code, 'OTP_VERIFIED');
    assert.ok(res.body.data.verificationToken);

    emailVerificationToken = res.body.data.verificationToken;
  });

  await suite.test('1.5 Should reject password creation when password is too short', async () => {
    const res = await request(app)
      .post('/api/customer-mobile/auth/register/set-password')
      .send({
        verificationToken: emailVerificationToken,
        password: '123',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  await suite.test('1.6 Should create permanent Customer with hashed password and issue mobile session', async () => {
    const res = await request(app)
      .post('/api/customer-mobile/auth/register/set-password')
      .send({
        verificationToken: emailVerificationToken,
        password: testPassword,
        fullName: 'Test Mobile User',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.code, 'ACCOUNT_CREATED');
    assert.ok(res.body.data.accessToken, 'Must return accessToken');
    assert.ok(res.body.data.refreshToken, 'Must return refreshToken');
    assert.ok(res.body.data.customer, 'Must return customer profile');
    assert.equal(res.body.data.customer.email, testEmail.toLowerCase());
    assert.ok(res.body.data.customer.customerCode.startsWith('CUST-'));

    createdEmailCustomerId = res.body.data.customer.id;
    activeAccessToken = res.body.data.accessToken;
    activeRefreshToken = res.body.data.refreshToken;

    // Verify DB integrity
    const dbCustomer = await prisma.customer.findUnique({
      where: { id: createdEmailCustomerId },
    });
    assert.ok(dbCustomer);
    assert.notEqual(dbCustomer.passwordHash, testPassword, 'Password must be hashed with bcrypt');
    assert.equal(dbCustomer.verificationStatus, 'VERIFIED');
    assert.equal(dbCustomer.status, 'ACTIVE');
  });

  await suite.test('1.7 Should prevent duplicate email registration for existing customer', async () => {
    const res = await request(app)
      .post('/api/customer-mobile/auth/register/email/start')
      .send({ email: testEmail, city: 'Addis Ababa' });

    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'EMAIL_ALREADY_EXISTS');
  });

  // ----------------------------------------------------------------------------
  // 2. REGISTRATION OPTION B: TELEGRAM BOT OTP
  // ----------------------------------------------------------------------------

  await suite.test('2.1 Should dispatch Telegram OTP for valid Ethiopian phone', async () => {
    const res = await request(app)
      .post('/api/customer-mobile/auth/register/telegram/start')
      .send({ phone: testPhone, city: 'Gondar' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.code, 'OTP_SENT');
    assert.ok(res.body.data.devOtp);

    telegramOtp = res.body.data.devOtp;
  });

  await suite.test('2.2 Should verify Telegram OTP and return verification ticket', async () => {
    const res = await request(app)
      .post('/api/customer-mobile/auth/register/telegram/verify')
      .send({ phone: testPhone, otp: telegramOtp });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.code, 'OTP_VERIFIED');
    assert.ok(res.body.data.verificationToken);

    telegramVerificationToken = res.body.data.verificationToken;
  });

  await suite.test('2.3 Should finalize Telegram registration with password creation', async () => {
    const res = await request(app)
      .post('/api/customer-mobile/auth/register/set-password')
      .send({
        verificationToken: telegramVerificationToken,
        password: testPassword,
        fullName: 'Telegram Mobile Customer',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.accessToken);
    assert.ok(res.body.data.refreshToken);

    createdTelegramCustomerId = res.body.data.customer.id;
  });

  await suite.test('2.4 Should prevent duplicate phone registration for existing customer', async () => {
    const res = await request(app)
      .post('/api/customer-mobile/auth/register/telegram/start')
      .send({ phone: testPhone, city: 'Gondar' });

    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'PHONE_ALREADY_EXISTS');
  });

  // ----------------------------------------------------------------------------
  // 3. MOBILE SIGN IN (EMAIL OR PHONE + PASSWORD)
  // ----------------------------------------------------------------------------

  await suite.test('3.1 Should sign in with Email + Password', async () => {
    const res = await request(app)
      .post('/api/customer-mobile/auth/login')
      .send({
        identifier: testEmail,
        password: testPassword,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.code, 'LOGIN_SUCCESS');
    assert.ok(res.body.data.accessToken);
    assert.ok(res.body.data.refreshToken);
    assert.equal(res.body.data.customer.id, createdEmailCustomerId);

    activeAccessToken = res.body.data.accessToken;
    activeRefreshToken = res.body.data.refreshToken;
  });

  await suite.test('3.2 Should sign in with Phone + Password', async () => {
    const res = await request(app)
      .post('/api/customer-mobile/auth/login')
      .send({
        identifier: testPhone,
        password: testPassword,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.code, 'LOGIN_SUCCESS');
    assert.equal(res.body.data.customer.id, createdTelegramCustomerId);
  });

  await suite.test('3.3 Should reject login with invalid password', async () => {
    const res = await request(app)
      .post('/api/customer-mobile/auth/login')
      .send({
        identifier: testEmail,
        password: 'WrongPassword123!',
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'INVALID_CREDENTIALS');
  });

  // ----------------------------------------------------------------------------
  // 4. AUTHENTICATED /ME PROFILE
  // ----------------------------------------------------------------------------

  await suite.test('4.1 Should retrieve safe customer profile via Bearer access token', async () => {
    const res = await request(app)
      .get('/api/customer-mobile/auth/me')
      .set('Authorization', `Bearer ${activeAccessToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, createdEmailCustomerId);
    assert.equal(res.body.data.email, testEmail.toLowerCase());
    assert.equal(res.body.data.passwordHash, undefined, 'Must NEVER return passwordHash');
  });

  await suite.test('4.2 Should reject /me when Authorization token is omitted', async () => {
    const res = await request(app).get('/api/customer-mobile/auth/me');

    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'TOKEN_MISSING');
  });

  // ----------------------------------------------------------------------------
  // 5. SESSION MANAGEMENT & REFRESH ROTATION
  // ----------------------------------------------------------------------------

  await suite.test('5.1 Should rotate refresh token and issue new access token on /refresh', async () => {
    const res = await request(app)
      .post('/api/customer-mobile/auth/refresh')
      .send({ refreshToken: activeRefreshToken });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.code, 'SESSION_REFRESHED');
    assert.ok(res.body.data.accessToken);
    assert.ok(res.body.data.refreshToken);
    assert.notEqual(res.body.data.refreshToken, activeRefreshToken, 'Must rotate refresh token');

    // Update active tokens
    activeAccessToken = res.body.data.accessToken;
    const previousRefreshToken = activeRefreshToken;
    activeRefreshToken = res.body.data.refreshToken;

    // Verify previous refresh token is no longer active (Rotation security)
    const staleRes = await request(app)
      .post('/api/customer-mobile/auth/refresh')
      .send({ refreshToken: previousRefreshToken });

    assert.equal(staleRes.status, 401);
    assert.equal(staleRes.body.code, 'SESSION_REVOKED');
  });

  await suite.test('5.2 Should revoke active session on /logout', async () => {
    const res = await request(app)
      .post('/api/customer-mobile/auth/logout')
      .send({ refreshToken: activeRefreshToken });

    assert.equal(res.status, 200);
    assert.equal(res.body.code, 'LOGGED_OUT');

    // Attempting to refresh after logout must fail
    const refreshRes = await request(app)
      .post('/api/customer-mobile/auth/refresh')
      .send({ refreshToken: activeRefreshToken });

    assert.equal(refreshRes.status, 401);
    assert.equal(refreshRes.body.code, 'SESSION_REVOKED');
  });

  // ----------------------------------------------------------------------------
  // 6. FORGOT & RESET PASSWORD
  // ----------------------------------------------------------------------------

  await suite.test('6.1 Should dispatch password reset OTP for registered email', async () => {
    const res = await request(app)
      .post('/api/customer-mobile/auth/forgot-password')
      .send({ identifier: testEmail });

    assert.equal(res.status, 200);
    assert.equal(res.body.code, 'PASSWORD_RESET_SENT');
  });

  await suite.test('6.2 Should verify reset OTP and change customer password', async () => {
    // Read the reset OTP from database
    const otpRecord = await prisma.customerMobileOtp.findFirst({
      where: {
        target: testEmail.toLowerCase(),
        purpose: 'PASSWORD_RESET',
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    assert.ok(otpRecord, 'OTP record must exist');

    // Generate a new OTP to test reset explicitly
    const resetOtp = '654321';
    const { hashToken } = await import('../src/shared/utils/crypto.js');
    await prisma.customerMobileOtp.update({
      where: { id: otpRecord.id },
      data: { codeHash: hashToken(resetOtp) },
    });

    const newPassword = 'NewSecretPassword2026!';
    const resetRes = await request(app)
      .post('/api/customer-mobile/auth/reset-password')
      .send({
        identifier: testEmail,
        otp: resetOtp,
        newPassword,
      });

    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.body.code, 'PASSWORD_RESET_SUCCESS');

    // Verify login with new password works
    const loginRes = await request(app)
      .post('/api/customer-mobile/auth/login')
      .send({
        identifier: testEmail,
        password: newPassword,
      });

    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.code, 'LOGIN_SUCCESS');

    // Verify login with old password fails
    const oldLoginRes = await request(app)
      .post('/api/customer-mobile/auth/login')
      .send({
        identifier: testEmail,
        password: testPassword,
      });

    assert.equal(oldLoginRes.status, 401);
  });
});
