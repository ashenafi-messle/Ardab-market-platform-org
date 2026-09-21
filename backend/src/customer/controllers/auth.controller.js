// ==============================================================================
// Ardab Market - Customer Authentication Controller
// ==============================================================================

import { ApiResponse } from '../../shared/utils/apiResponse.js';
import {
  registerCustomerAccount,
  resendVerificationEmail,
  verifyCustomerEmail,
  setCustomerPassword,
  loginCustomer,
  loginWithGoogleRegisteredAccount,
  getCustomerProfile,
  requestCustomerPasswordReset,
  resetCustomerPassword,
} from '../services/customerAuth.service.js';

/**
 * POST /api/customer/auth/register
 * Simple Registration with Email, Phone, City
 */
export async function registerCustomerHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const result = await registerCustomerAccount(req.body, ipAddress);
  return ApiResponse.success(res, result, result.message, 201);
}

/**
 * POST /api/customer/auth/resend-verification
 * Resend verification link to customer email
 */
export async function resendVerificationHandler(req, res) {
  const result = await resendVerificationEmail({ email: req.body.email });
  return ApiResponse.success(res, result, result.message);
}

/**
 * POST /api/customer/auth/verify-email
 * Email verification endpoint
 */
export async function verifyEmailHandler(req, res) {
  const result = await verifyCustomerEmail(req.body);
  return ApiResponse.success(res, result, 'Email verified successfully');
}

/**
 * POST /api/customer/auth/set-password
 * Set password and automatically authenticate
 */
export async function setPasswordHandler(req, res) {
  const result = await setCustomerPassword(req.body);
  return ApiResponse.success(res, result, 'Password configured successfully. Authenticated.');
}

/**
 * POST /api/customer/auth/login
 * Single login form: Email OR Phone + Password
 */
export async function loginCustomerHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const userAgent = req.headers['user-agent'] || null;
  const result = await loginCustomer({
    identifier: req.body.identifier || req.body.email || req.body.phone,
    password: req.body.password,
    ipAddress,
    userAgent,
  });
  return ApiResponse.success(res, result, 'Logged in successfully');
}

/**
 * POST /api/customer/auth/google-login
 * Continues with Google using registered device account / email
 */
export async function loginWithGoogleHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const userAgent = req.headers['user-agent'] || null;
  const result = await loginWithGoogleRegisteredAccount({
    email: req.body.email,
    ipAddress,
    userAgent,
    googleProfile: {
      name: req.body.name,
      picture: req.body.picture || req.body.photoUrl,
    },
  });
  return ApiResponse.success(res, result, 'Authenticated with Google successfully');
}

/**
 * GET /api/customer/auth/me
 * Retrieves current authenticated customer profile
 */
export async function getCurrentCustomerHandler(req, res) {
  const customerId = req.customer?.id;
  const customer = await getCustomerProfile(customerId);
  return ApiResponse.success(res, customer, 'Current customer profile retrieved');
}

/**
 * POST /api/customer/auth/forgot-password
 * Request a password reset link sent to customer email
 */
export async function forgotPasswordHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const result = await requestCustomerPasswordReset({
    email: req.body.email,
    ipAddress,
  });
  return ApiResponse.success(res, result, result.message);
}

/**
 * POST /api/customer/auth/reset-password
 * Reset customer password using token
 */
export async function resetPasswordHandler(req, res) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const result = await resetCustomerPassword({
    token: req.body.token,
    email: req.body.email,
    newPassword: req.body.password || req.body.newPassword,
    ipAddress,
  });
  return ApiResponse.success(res, result, result.message);
}
