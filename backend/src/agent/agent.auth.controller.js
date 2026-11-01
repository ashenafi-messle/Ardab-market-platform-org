// ==============================================================================
// Ardab Market - Agent Authentication Controller
// ==============================================================================

import { AgentAuthService } from './agent.auth.service.js';
import { ApiResponse } from '../shared/utils/apiResponse.js';
import {
  requestActivationOtpSchema,
  verifyActivationOtpSchema,
  setPasswordSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './agent.validation.js';

export class AgentAuthController {
  /**
   * POST /api/agent/auth/request-activation-otp
   */
  static async requestActivationOtp(req, res) {
    const validated = requestActivationOtpSchema.parse(req.body);
    const result = await AgentAuthService.requestActivationOtp(validated.email);
    return ApiResponse.success(res, result, result.message);
  }

  /**
   * POST /api/agent/auth/verify-activation-otp
   */
  static async verifyActivationOtp(req, res) {
    const validated = verifyActivationOtpSchema.parse(req.body);
    const result = await AgentAuthService.verifyActivationOtp(validated.email, validated.otp);
    return ApiResponse.success(res, result, result.message);
  }

  /**
   * POST /api/agent/auth/set-password
   */
  static async setPassword(req, res) {
    const validated = setPasswordSchema.parse(req.body);
    const result = await AgentAuthService.setPassword(validated.activationToken, validated.password);
    return ApiResponse.success(res, result, result.message);
  }

  /**
   * POST /api/agent/auth/login
   */
  static async login(req, res) {
    const validated = loginSchema.parse(req.body);
    const deviceInfo = validated.deviceInfo || req.headers['user-agent'] || null;
    const result = await AgentAuthService.login(validated.email, validated.password, deviceInfo);
    return ApiResponse.success(res, result, 'Login successful.');
  }

  /**
   * POST /api/agent/auth/refresh
   */
  static async refresh(req, res) {
    const validated = refreshSchema.parse(req.body);
    const deviceInfo = validated.deviceInfo || req.headers['user-agent'] || null;
    const result = await AgentAuthService.refresh(validated.refreshToken, deviceInfo);
    return ApiResponse.success(res, result, 'Session refreshed successfully.');
  }

  /**
   * POST /api/agent/auth/logout
   */
  static async logout(req, res) {
    const refreshToken = req.body.refreshToken || null;
    const result = await AgentAuthService.logout(req.agent.id, refreshToken);
    return ApiResponse.success(res, null, result.message);
  }

  /**
   * POST /api/agent/auth/forgot-password
   */
  static async forgotPassword(req, res) {
    const validated = forgotPasswordSchema.parse(req.body);
    const result = await AgentAuthService.forgotPassword(validated.email);
    return ApiResponse.success(res, result, result.message);
  }

  /**
   * POST /api/agent/auth/verify-reset-otp
   */
  static async verifyResetOtp(req, res) {
    const validated = verifyResetOtpSchema.parse(req.body);
    const result = await AgentAuthService.verifyResetOtp(validated.email, validated.otp);
    return ApiResponse.success(res, result, result.message);
  }

  /**
   * POST /api/agent/auth/reset-password
   */
  static async resetPassword(req, res) {
    const validated = resetPasswordSchema.parse(req.body);
    const result = await AgentAuthService.resetPassword(validated.resetToken, validated.password);
    return ApiResponse.success(res, null, result.message);
  }

  /**
   * POST /api/agent/auth/change-password
   */
  static async changePassword(req, res) {
    const validated = changePasswordSchema.parse(req.body);
    const result = await AgentAuthService.changePassword(
      req.agent.id,
      validated.currentPassword,
      validated.newPassword
    );
    return ApiResponse.success(res, null, result.message);
  }

  /**
   * GET /api/agent/auth/me
   */
  static async getMe(req, res) {
    return ApiResponse.success(res, { agent: req.agent });
  }
}
