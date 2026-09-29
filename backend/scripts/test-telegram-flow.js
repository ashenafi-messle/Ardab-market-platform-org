// ==============================================================================
// Ardab Market - Telegram OTP Flow Comprehensive End-to-End Verification Test
// ==============================================================================

import { prisma } from '../src/shared/config/database.js';
import { TelegramService } from '../src/shared/services/telegram/telegram.service.js';
import { MobileOtpService } from '../src/customer-mobile/services/otp.service.js';
import { MobileAuthService } from '../src/customer-mobile/services/auth.service.js';
import { hashToken, timingSafeEqual } from '../src/shared/utils/crypto.js';

async function runTests() {
  console.log('====================================================================');
  console.log('RUNNING TELEGRAM OTP FLOW INTEGRATION TESTS');
  console.log('====================================================================\n');

  const testPhone = `+25191${Math.floor(1000000 + Math.random() * 9000000)}`;
  const testChatId = `777${Math.floor(100000 + Math.random() * 900000)}`;
  const testCity = 'Gondar';

  console.log(`[TEST SETUP] Test Phone: ${testPhone}, Simulated Telegram Chat ID: ${testChatId}\n`);

  try {
    // --------------------------------------------------------------------------
    // TEST 1: Handle /start without token
    // --------------------------------------------------------------------------
    console.log('--- TEST 1: Customer opens bot and runs /start with NO token ---');
    const updateNoToken = {
      update_id: 1001,
      message: {
        message_id: 1,
        chat: { id: testChatId, type: 'private' },
        from: { id: testChatId, first_name: 'TestUser' },
        text: '/start',
      },
    };

    const resNoToken = await TelegramService.handleTelegramUpdate(updateNoToken);
    console.log('Response for /start without token:', resNoToken);
    if (resNoToken.reason === 'NO_TOKEN') {
      console.log('✓ TEST 1 PASSED: Unknown user advised to start from mobile app, no OTP generated.\n');
    } else {
      throw new Error(`TEST 1 FAILED: Expected NO_TOKEN, got ${JSON.stringify(resNoToken)}`);
    }

    // --------------------------------------------------------------------------
    // TEST 2: Handle /start with invalid token
    // --------------------------------------------------------------------------
    console.log('--- TEST 2: /start with invalid/non-existent token ---');
    const updateInvalidToken = {
      update_id: 1002,
      message: {
        message_id: 2,
        chat: { id: testChatId, type: 'private' },
        from: { id: testChatId, first_name: 'TestUser' },
        text: '/start invalid_token_12345',
      },
    };

    const resInvalidToken = await TelegramService.handleTelegramUpdate(updateInvalidToken);
    console.log('Response for invalid start token:', resInvalidToken);
    if (resInvalidToken.reason === 'TOKEN_NOT_FOUND') {
      console.log('✓ TEST 2 PASSED: Invalid token safely rejected, no OTP generated.\n');
    } else {
      throw new Error(`TEST 2 FAILED: Expected TOKEN_NOT_FOUND, got ${JSON.stringify(resInvalidToken)}`);
    }

    // --------------------------------------------------------------------------
    // TEST 3: Mobile App starts Telegram registration
    // --------------------------------------------------------------------------
    console.log('--- TEST 3: Mobile App creates pending Telegram verification session ---');
    const startSession = await MobileOtpService.requestTelegramOtpSession({
      phone: testPhone,
      city: testCity,
    });

    console.log('Session response:', {
      success: startSession.success,
      channel: startSession.channel,
      botUrl: startSession.botUrl,
      startToken: startSession.startToken,
      expiresInSeconds: startSession.expiresInSeconds,
    });

    if (!startSession.startToken || !startSession.botUrl.includes(startSession.startToken)) {
      throw new Error('TEST 3 FAILED: startToken missing or not embedded in botUrl');
    }

    // Verify session in database
    const savedSession = await prisma.customerMobileOtp.findUnique({
      where: { telegramToken: startSession.startToken },
    });

    if (!savedSession || savedSession.target !== testPhone) {
      throw new Error('TEST 3 FAILED: Database record not created properly');
    }

    console.log('Database record verified: target =', savedSession.target, ', telegramToken =', savedSession.telegramToken);
    console.log('✓ TEST 3 PASSED: Pending session created with secure opaque token.\n');

    // --------------------------------------------------------------------------
    // TEST 4: Bot receives /start with valid startToken
    // --------------------------------------------------------------------------
    console.log('--- TEST 4: Customer starts bot with valid deep link: /start <token> ---');
    const updateValidToken = {
      update_id: 1003,
      message: {
        message_id: 3,
        chat: { id: testChatId, type: 'private' },
        from: { id: testChatId, first_name: 'TestUser' },
        text: `/start ${startSession.startToken}`,
      },
    };

    const resValid = await TelegramService.handleTelegramUpdate(updateValidToken);
    console.log('Response for valid start token:', resValid);

    // Re-check database record after /start
    const updatedRecord = await prisma.customerMobileOtp.findUnique({
      where: { telegramToken: startSession.startToken },
    });

    console.log('Updated Record State:', {
      telegramChatId: updatedRecord.telegramChatId,
      codeHashUpdated: updatedRecord.codeHash !== savedSession.codeHash,
      attempts: updatedRecord.attempts,
      expiresAt: updatedRecord.expiresAt,
    });

    if (updatedRecord.telegramChatId !== String(testChatId)) {
      throw new Error('TEST 4 FAILED: telegramChatId was not associated with record');
    }
    if (updatedRecord.codeHash === savedSession.codeHash) {
      throw new Error('TEST 4 FAILED: codeHash was not updated to real OTP hash');
    }
    console.log('✓ TEST 4 PASSED: telegramChatId linked, secure OTP hash generated & stored.\n');

    // --------------------------------------------------------------------------
    // TEST 5: Repeated /start within 60s cooldown
    // --------------------------------------------------------------------------
    console.log('--- TEST 5: Repeated /start spam within 60-second cooldown ---');
    const spamRes = await TelegramService.handleTelegramUpdate(updateValidToken);
    console.log('Response for repeated /start:', spamRes);
    if (spamRes.reason === 'COOLDOWN') {
      console.log('✓ TEST 5 PASSED: Rate limit cooldown prevented OTP spam.\n');
    } else {
      throw new Error(`TEST 5 FAILED: Expected COOLDOWN, got ${JSON.stringify(spamRes)}`);
    }

    // --------------------------------------------------------------------------
    // TEST 6: Mobile App enters wrong OTP
    // --------------------------------------------------------------------------
    console.log('--- TEST 6: Customer enters wrong OTP in mobile app ---');
    let wrongOtpFailed = false;
    try {
      await MobileOtpService.verifyOtp({
        target: testPhone,
        channel: 'TELEGRAM',
        otp: '000000',
      });
    } catch (err) {
      wrongOtpFailed = true;
      console.log('Expected error on wrong OTP:', err.message);
    }

    if (!wrongOtpFailed) {
      throw new Error('TEST 6 FAILED: Wrong OTP was unexpectedly accepted!');
    }

    const checkAttempts = await prisma.customerMobileOtp.findUnique({
      where: { id: updatedRecord.id },
    });
    console.log('Attempt count after wrong OTP:', checkAttempts.attempts);
    if (checkAttempts.attempts !== 1) {
      throw new Error('TEST 6 FAILED: Attempt count did not increment');
    }
    console.log('✓ TEST 6 PASSED: Wrong OTP rejected and attempt count incremented.\n');

    // --------------------------------------------------------------------------
    // TEST 7: Mobile App enters correct OTP
    // --------------------------------------------------------------------------
    console.log('--- TEST 7: Customer enters correct OTP in mobile app ---');
    // For test simulation, let's find the OTP by computing hash match or using known OTP
    // Let's create a known test OTP hash on this record to simulate correct entry
    const knownTestOtp = '482913';
    const knownHash = hashToken(knownTestOtp);
    await prisma.customerMobileOtp.update({
      where: { id: updatedRecord.id },
      data: { codeHash: knownHash },
    });

    const verifyResult = await MobileOtpService.verifyOtp({
      target: testPhone,
      channel: 'TELEGRAM',
      otp: knownTestOtp,
    });

    console.log('Verify result:', verifyResult);
    if (!verifyResult.verified || !verifyResult.verificationToken) {
      throw new Error('TEST 7 FAILED: OTP verification failed to return verificationToken');
    }
    console.log('✓ TEST 7 PASSED: Correct OTP verified successfully, issued single-use verificationToken.\n');

    // --------------------------------------------------------------------------
    // TEST 8: Replay attack prevention (reuse of verified OTP)
    // --------------------------------------------------------------------------
    console.log('--- TEST 8: Replay attack — attempting to re-verify already consumed OTP ---');
    let replayBlocked = false;
    try {
      await MobileOtpService.verifyOtp({
        target: testPhone,
        channel: 'TELEGRAM',
        otp: knownTestOtp,
      });
    } catch (err) {
      replayBlocked = true;
      console.log('Expected error on re-verification:', err.message);
    }

    if (!replayBlocked) {
      throw new Error('TEST 8 FAILED: Replay attack succeeded! Consumed OTP was re-verified.');
    }
    console.log('✓ TEST 8 PASSED: Replay attack prevented.\n');

    // --------------------------------------------------------------------------
    // TEST 9: Finalize Account Creation with Password
    // --------------------------------------------------------------------------
    console.log('--- TEST 9: Set password and finalize Customer creation ---');
    const accountResult = await MobileAuthService.setPasswordAndCreateAccount({
      verificationToken: verifyResult.verificationToken,
      password: 'SecurePassword123!',
      fullName: 'Abebe Kebede',
    });

    console.log('Account creation result:', {
      message: accountResult.message,
      customerId: accountResult.customer?.id,
      customerCode: accountResult.customer?.customerCode,
      hasAccessToken: Boolean(accountResult.accessToken),
      hasRefreshToken: Boolean(accountResult.refreshToken),
    });

    const createdCustomer = await prisma.customer.findFirst({
      where: { phone: testPhone },
    });

    console.log('Customer in database:', {
      id: createdCustomer?.id,
      fullName: createdCustomer?.fullName,
      phone: createdCustomer?.phone,
      telegramUserId: createdCustomer?.telegramUserId,
      verificationStatus: createdCustomer?.verificationStatus,
      status: createdCustomer?.status,
    });

    if (!createdCustomer || createdCustomer.telegramUserId !== String(testChatId)) {
      throw new Error('TEST 9 FAILED: Customer not created with correct telegramUserId');
    }
    console.log('✓ TEST 9 PASSED: Account created, telegramUserId linked, JWT session issued.\n');

    // --------------------------------------------------------------------------
    // TEST 10: Duplicate Signup Prevention
    // --------------------------------------------------------------------------
    console.log('--- TEST 10: Duplicate signup attempt with existing phone ---');
    let dupBlocked = false;
    try {
      await MobileAuthService.startTelegramRegistration({
        phone: testPhone,
        city: testCity,
      });
    } catch (err) {
      dupBlocked = true;
      console.log('Expected duplicate conflict error:', err.message);
    }

    if (!dupBlocked) {
      throw new Error('TEST 10 FAILED: Duplicate phone signup was not blocked!');
    }
    console.log('✓ TEST 10 PASSED: Duplicate registration safely blocked with conflict error.\n');

    console.log('====================================================================');
    console.log('ALL 10 TELEGRAM OTP FLOW INTEGRATION TESTS PASSED PERFECTLY!');
    console.log('====================================================================\n');
  } catch (error) {
    console.error('\n❌ INTEGRATION TEST FAILED:', error);
    process.exit(1);
  } finally {
    // Clean up test customer and test OTP records
    await prisma.customerMobileOtp.deleteMany({ where: { target: testPhone } }).catch(() => {});
    await prisma.customerMobileSession.deleteMany({ where: { customer: { phone: testPhone } } }).catch(() => {});
    await prisma.customer.deleteMany({ where: { phone: testPhone } }).catch(() => {});
    console.log('[TEST CLEANUP] Test data removed.');
    process.exit(0);
  }
}

runTests();
