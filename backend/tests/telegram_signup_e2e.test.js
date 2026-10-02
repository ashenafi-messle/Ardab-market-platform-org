// ==============================================================================
// Ardab Market - Telegram Signup + Automated OTP End-to-End Test Suite
// ==============================================================================
// Validates the full 20-step lifecycle:
// Deep-link generation -> /start bot handling -> Automatic OTP -> Manual verify -> Customer creation

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/shared/config/database.js';
import { TelegramService } from '../src/shared/services/telegram/telegram.service.js';
import { hashToken } from '../src/shared/utils/crypto.js';

const app = createApp();

test('Telegram Customer Signup Flow - Complete 20-Step End-to-End Test', async (suite) => {
  const timestamp = Date.now();
  const testPhone = `+251912${String(timestamp).slice(-6)}`;
  const testCity = 'Gondar';
  const testChatId = `7788${String(timestamp).slice(-5)}`;
  const testUserId = `tg_user_${String(timestamp).slice(-5)}`;
  const testUsername = 'ardab_test_buyer';

  let sessionId = null;
  let rawStartToken = null;
  let simulatedOtp = '482915';
  let createdCustomerId = null;
  let accessToken = null;

  suite.after(async () => {
    try {
      if (createdCustomerId) {
        await prisma.customerMobileSession.deleteMany({ where: { customerId: createdCustomerId } });
        await prisma.customer.deleteMany({ where: { id: createdCustomerId } });
      }
      if (sessionId) {
        await prisma.telegramSignupSession.deleteMany({ where: { id: sessionId } });
      }
      await prisma.telegramSignupSession.deleteMany({ where: { phone: testPhone } });
      await prisma.customer.deleteMany({ where: { phone: testPhone } });
    } catch (err) {
      console.warn('[E2E Test] Cleanup notice:', err.message);
    }
  });

  // ----------------------------------------------------------------------------
  // STEP 1-5: Mobile requests Telegram Signup start
  // ----------------------------------------------------------------------------
  await suite.test('Steps 1-5: Should start Telegram signup and return deep link without OTP leak', async () => {
    const res = await request(app)
      .post('/api/customer-mobile/auth/register/telegram/start')
      .send({ phone: testPhone, city: testCity });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.sessionId, 'Should return sessionId');
    assert.ok(res.body.data.telegramUrl, 'Should return telegramUrl deep link');
    assert.equal(res.body.data.status, 'PENDING_BOT_START');

    // Security assertions: NEVER leak raw OTP or tokenHash in client response
    assert.equal(res.body.data.otp, undefined);
    assert.equal(res.body.data.devOtp, undefined);
    assert.equal(res.body.data.tokenHash, undefined);

    sessionId = res.body.data.sessionId;

    // Extract raw token from telegramUrl: https://t.me/BotUsername?start=RAW_TOKEN
    const urlMatch = res.body.data.telegramUrl.match(/[?&]start=([a-zA-Z0-9_-]+)/);
    assert.ok(urlMatch && urlMatch[1], 'Deep link must contain start token parameter');
    rawStartToken = urlMatch[1];

    // Verify DB state: ONLY tokenHash is stored, customer NOT created yet
    const sessionInDb = await prisma.telegramSignupSession.findUnique({
      where: { id: sessionId },
    });
    assert.ok(sessionInDb);
    assert.equal(sessionInDb.phone, testPhone);
    assert.equal(sessionInDb.status, 'PENDING_BOT_START');
    assert.equal(sessionInDb.tokenHash, hashToken(rawStartToken));
    assert.equal(sessionInDb.otpHash, null);

    // Verify Customer record does NOT exist yet (Requirement 17)
    const customerBefore = await prisma.customer.findFirst({ where: { phone: testPhone } });
    assert.equal(customerBefore, null, 'Customer must NOT be created before verification');
  });

  // ----------------------------------------------------------------------------
  // STEP 6-7: Mobile checks initial status
  // ----------------------------------------------------------------------------
  await suite.test('Steps 6-7: Mobile polling should return PENDING_BOT_START status', async () => {
    const res = await request(app)
      .get(`/api/customer-mobile/auth/register/telegram/status/${sessionId}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'PENDING_BOT_START');
    assert.equal(res.body.data.otp, undefined);
    assert.equal(res.body.data.otpHash, undefined);
  });

  // ----------------------------------------------------------------------------
  // STEP 8-13: Telegram Bot receives /start with token from customer
  // ----------------------------------------------------------------------------
  await suite.test('Steps 8-13: Telegram Bot should process /start token and generate secure OTP', async () => {
    // Intercept/mock Telegram Bot sendMessage to capture dispatched OTP safely
    const originalSendMessage = TelegramService.sendMessage;
    let capturedDispatchedOtp = null;

    TelegramService.sendMessage = async (chatId, text, options) => {
      // Extract numeric OTP from message if present
      const match = text.match(/\*(\d{6})\*/);
      if (match) {
        capturedDispatchedOtp = match[1];
      }
      return { success: true, messageId: 99991 };
    };

    try {
      const updatePayload = {
        update_id: 88812,
        message: {
          message_id: 101,
          chat: { id: testChatId, type: 'private' },
          from: { id: testUserId, username: testUsername },
          text: `/start ${rawStartToken}`,
        },
      };

      const result = await TelegramService.handleTelegramUpdate(updatePayload);
      assert.equal(result.success, true, 'handleTelegramUpdate should succeed');
      assert.ok(capturedDispatchedOtp, 'OTP should be dispatched via Telegram bot message');
      assert.equal(capturedDispatchedOtp.length, 6);

      simulatedOtp = capturedDispatchedOtp;

      // Verify DB session was updated to OTP_SENT with hashed OTP
      const updatedSession = await prisma.telegramSignupSession.findUnique({
        where: { id: sessionId },
      });
      assert.equal(updatedSession.status, 'OTP_SENT');
      assert.equal(updatedSession.telegramChatId, testChatId);
      assert.equal(updatedSession.telegramUserId, testUserId);
      assert.equal(updatedSession.telegramUsername, testUsername);
      assert.equal(updatedSession.otpAttempts, 0);
      assert.equal(updatedSession.otpHash, hashToken(simulatedOtp));
    } finally {
      TelegramService.sendMessage = originalSendMessage;
    }
  });

  // ----------------------------------------------------------------------------
  // STEP 14: Mobile app detects OTP_SENT
  // ----------------------------------------------------------------------------
  await suite.test('Step 14: Mobile status polling should detect OTP_SENT', async () => {
    const res = await request(app)
      .get(`/api/customer-mobile/auth/register/telegram/status/${sessionId}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'OTP_SENT');
  });

  // ----------------------------------------------------------------------------
  // STEP 15-16a: Customer enters wrong OTP
  // ----------------------------------------------------------------------------
  await suite.test('Step 15-16a: Should reject incorrect OTP and increment attempt counter', async () => {
    const res = await request(app)
      .post('/api/customer-mobile/auth/register/telegram/verify')
      .send({
        sessionId,
        phone: testPhone,
        otp: '000000',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('Invalid') || res.body.message.includes('attempts'));

    const sessionInDb = await prisma.telegramSignupSession.findUnique({
      where: { id: sessionId },
    });
    assert.equal(sessionInDb.otpAttempts, 1);
  });

  // ----------------------------------------------------------------------------
  // STEP 16-18: Customer manually enters correct OTP
  // ----------------------------------------------------------------------------
  await suite.test('Steps 16-18: Should verify correct OTP, create Customer, and issue session tokens', async () => {
    const res = await request(app)
      .post('/api/customer-mobile/auth/register/telegram/verify')
      .send({
        sessionId,
        phone: testPhone,
        otp: simulatedOtp,
        fullName: 'Abebe Bikila',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.verified, true);
    assert.ok(res.body.data.accessToken, 'Should return accessToken');
    assert.ok(res.body.data.refreshToken, 'Should return refreshToken');
    assert.ok(res.body.data.customer, 'Should return customer object');
    assert.equal(res.body.data.customer.phone, testPhone);

    createdCustomerId = res.body.data.customer.id;
    accessToken = res.body.data.accessToken;

    // Check DB session status is now VERIFIED
    const sessionInDb = await prisma.telegramSignupSession.findUnique({
      where: { id: sessionId },
    });
    assert.equal(sessionInDb.status, 'VERIFIED');
    assert.ok(sessionInDb.verifiedAt);
  });

  // ----------------------------------------------------------------------------
  // STEP 19-20: Confirm single customer in PostgreSQL and authenticated API access
  // ----------------------------------------------------------------------------
  await suite.test('Steps 19-20: Confirm new customer exists exactly ONCE in database', async () => {
    const matchingCustomers = await prisma.customer.findMany({
      where: { phone: testPhone },
    });

    assert.equal(matchingCustomers.length, 1, 'Customer must exist exactly once in PostgreSQL');
    const customer = matchingCustomers[0];
    assert.equal(customer.phone, testPhone);
    assert.equal(customer.city, testCity);
    assert.equal(customer.telegramUserId, testUserId);
    assert.equal(customer.verificationStatus, 'VERIFIED');
    assert.equal(customer.status, 'ACTIVE');

    // Test that customer mobile session token works for profile
    const profileRes = await request(app)
      .get('/api/customer-mobile/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    assert.equal(profileRes.status, 200);
    assert.equal(profileRes.body.data.id, customer.id);
  });

  // ----------------------------------------------------------------------------
  // BONUS VALIDATION: Prevent duplicate registration and check rate limiting
  // ----------------------------------------------------------------------------
  await suite.test('Duplicate Prevention: Reject start for already-registered phone', async () => {
    const res = await request(app)
      .post('/api/customer-mobile/auth/register/telegram/start')
      .send({ phone: testPhone, city: testCity });

    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'PHONE_ALREADY_EXISTS');
  });
});
