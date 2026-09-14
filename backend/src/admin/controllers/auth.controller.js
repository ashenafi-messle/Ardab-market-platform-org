// ==============================================================================
// Ardab Market - Admin Authentication Controller
// ==============================================================================

import {
  loginAdmin,
  logoutAdmin,
  getAdminById,
  requestPasswordReset,
  executePasswordReset,
} from '../services/auth.service.js';
import { OtpService } from '../services/otp.service.js';
import { ApiResponse } from '../../shared/utils/apiResponse.js';

export async function login(req, res) {
  const { email, password } = req.body;
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
  const userAgent = req.headers['user-agent'];

  const result = await loginAdmin({ email, password, ipAddress, userAgent });

  res.cookie('token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  });

  return ApiResponse.success(res, result, 'Authenticated successfully');
}

export async function getMe(req, res) {
  const admin = await getAdminById(req.user.id);
  return ApiResponse.success(res, { user: admin }, 'Admin profile retrieved');
}

export async function logout(req, res) {
  const token = req.token;
  const adminId = req.user?.id;
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;

  const result = await logoutAdmin({ token, adminId, ipAddress });

  res.clearCookie('token');
  return ApiResponse.success(res, null, result.message);
}

export async function forgotPassword(req, res) {
  const { email } = req.body;
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;

  const result = await requestPasswordReset({ email, ipAddress });

  return ApiResponse.success(res, result, result.message);
}

export async function resetPassword(req, res) {
  const { token, password, newPassword } = req.body;
  const targetPassword = newPassword || password;
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;

  const result = await executePasswordReset({ token, newPassword: targetPassword, ipAddress });

  return ApiResponse.success(res, null, result.message);
}

export async function requestOtp(req, res) {
  const { email, purpose } = req.body;
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;

  const result = await OtpService.requestOtp({ email, purpose, ipAddress });

  return ApiResponse.success(res, result, result.message);
}

export async function verifyOtp(req, res) {
  const { email, code, purpose } = req.body;
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;

  const result = await OtpService.verifyOtp({ email, code, purpose, ipAddress });

  return ApiResponse.success(res, result, result.message);
}

