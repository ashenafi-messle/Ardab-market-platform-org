// ==============================================================================
// Ardab Market - Customer Mobile Authentication Controller
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import { MobileAuthService } from '../services/auth.service.js';
import { AuthResponseCode } from '../utils/responseCodes.js';

/**
 * POST /api/customer-mobile/auth/register/email/start
 * Step 1: Validate email & city, check uniqueness, send 6-digit OTP
 */
export async function startEmailRegistrationHandler(req, res) {
  const result = await MobileAuthService.startEmailRegistration({
    email: req.body.email,
    city: req.body.city,
    deliveryZone: req.body.deliveryZone,
  });

  return ApiResponse.success(res, result, 'Verification code sent to your email.', 200, {
    code: AuthResponseCode.OTP_SENT,
  });
}

/**
 * POST /api/customer-mobile/auth/register/email/verify
 * Step 2: Verify 6-digit email OTP, return temporary password creation ticket
 */
export async function verifyEmailRegistrationHandler(req, res) {
  const result = await MobileAuthService.verifyEmailRegistration({
    email: req.body.email,
    otp: req.body.otp,
  });

  return ApiResponse.success(res, result, 'Email verified successfully.', 200, {
    code: AuthResponseCode.OTP_VERIFIED,
  });
}

/**
 * POST /api/customer-mobile/auth/register/telegram/start
 * Step 1: Validate phone & city, check uniqueness, send Telegram OTP via bot
 */
export async function startTelegramRegistrationHandler(req, res) {
  const result = await MobileAuthService.startTelegramRegistration({
    phone: req.body.phone,
    city: req.body.city,
    telegramUserId: req.body.telegramUserId,
    deliveryZone: req.body.deliveryZone,
  });

  return ApiResponse.success(
    res,
    result,
    'Verification code sent via Telegram bot.',
    200,
    { code: AuthResponseCode.OTP_SENT }
  );
}

/**
 * POST /api/customer-mobile/auth/register/telegram/verify
 * Step 2: Verify 6-digit Telegram OTP, return temporary password creation ticket
 */
export async function verifyTelegramRegistrationHandler(req, res) {
  const result = await MobileAuthService.verifyTelegramRegistration({
    phone: req.body.phone,
    otp: req.body.otp,
  });

  return ApiResponse.success(res, result, 'Telegram identity verified successfully.', 200, {
    code: AuthResponseCode.OTP_VERIFIED,
  });
}

/**
 * POST /api/customer-mobile/auth/register/set-password
 * Step 3: Validate password, create Customer record, generate mobile session
 */
export async function setPasswordHandler(req, res) {
  const deviceInfo = req.headers['user-agent'] || req.body.deviceInfo || null;

  const result = await MobileAuthService.setPasswordAndCreateAccount({
    verificationToken: req.body.verificationToken,
    password: req.body.password,
    fullName: req.body.fullName,
    deliveryZone: req.body.deliveryZone,
    deviceInfo,
  });

  return ApiResponse.success(res, result, 'Account created successfully.', 201, {
    code: AuthResponseCode.ACCOUNT_CREATED,
  });
}

/**
 * POST /api/customer-mobile/auth/login
 * Unified sign-in: Email OR Phone Number + Password
 */
export async function loginHandler(req, res) {
  const deviceInfo = req.headers['user-agent'] || req.body.deviceInfo || null;

  const result = await MobileAuthService.login({
    identifier: req.body.identifier,
    password: req.body.password,
    deviceInfo,
  });

  return ApiResponse.success(res, result, 'Signed in successfully.', 200, {
    code: AuthResponseCode.LOGIN_SUCCESS,
  });
}

/**
 * POST /api/customer-mobile/auth/refresh
 * Restores session or rotates access & refresh tokens
 */
export async function refreshTokenHandler(req, res) {
  const deviceInfo = req.headers['user-agent'] || req.body.deviceInfo || null;
  const rawRefreshToken = req.body.refreshToken;

  const result = await MobileAuthService.refresh(rawRefreshToken, deviceInfo);

  return ApiResponse.success(res, result, 'Session refreshed successfully.', 200, {
    code: AuthResponseCode.SESSION_REFRESHED,
  });
}

/**
 * POST /api/customer-mobile/auth/logout
 * Revokes refresh token in database
 */
export async function logoutHandler(req, res) {
  const rawRefreshToken = req.body.refreshToken;
  await MobileAuthService.logout(rawRefreshToken);

  return ApiResponse.success(res, { loggedOut: true }, 'Signed out successfully.', 200, {
    code: AuthResponseCode.LOGGED_OUT,
  });
}

/**
 * GET /api/customer-mobile/auth/me
 * Retrieves current customer's safe profile
 */
export async function getMeHandler(req, res) {
  const profile = await MobileAuthService.getMe(req.customer.id);
  return ApiResponse.success(res, profile, 'Customer profile retrieved.');
}

/**
 * POST /api/customer-mobile/auth/forgot-password
 * Initiates 6-digit OTP password reset
 */
export async function forgotPasswordHandler(req, res) {
  const result = await MobileAuthService.forgotPassword({
    identifier: req.body.identifier,
  });

  return ApiResponse.success(res, result, result.message, 200, {
    code: result.code,
  });
}

/**
 * POST /api/customer-mobile/auth/reset-password
 * Verifies OTP and applies new password
 */
export async function resetPasswordHandler(req, res) {
  const result = await MobileAuthService.resetPassword({
    identifier: req.body.identifier,
    otp: req.body.otp,
    newPassword: req.body.newPassword,
  });

  return ApiResponse.success(res, result, result.message, 200, {
    code: result.code,
  });
}
