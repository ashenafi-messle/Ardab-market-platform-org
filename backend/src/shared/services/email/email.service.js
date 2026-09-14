// ==============================================================================
// Ardab Market - Email Abstraction Service
// ==============================================================================
// High-level email dispatch service consumed by authentication and security controllers.
// Wraps template rendering and Brevo API dispatch cleanly.

import { sendBrevoEmail } from './brevo.client.js';
import {
  getPasswordResetTemplate,
  getOtpTemplate,
  getPasswordChangedNotificationTemplate,
} from './email.templates.js';

export class EmailService {
  /**
   * Dispatches Password Reset Email with frontend reset link
   */
  static async sendPasswordResetEmail({ toEmail, name, resetUrl, expiresMinutes = 15 }) {
    const { htmlContent, textContent } = getPasswordResetTemplate({
      name,
      resetUrl,
      expiresMinutes,
    });

    return sendBrevoEmail({
      toEmail,
      toName: name,
      subject: 'Reset Your Ardab Market Admin Password',
      htmlContent,
      textContent,
    });
  }

  /**
   * Dispatches One-Time Password (OTP) Email
   */
  static async sendOtpEmail({ toEmail, name, otpCode, purpose = 'SECURITY_VERIFICATION', expiresMinutes = 10 }) {
    const purposeMap = {
      LOGIN_VERIFICATION: 'Login Security Verification',
      PASSWORD_RESET: 'Password Reset Verification',
      EMAIL_VERIFICATION: 'Email Verification',
      SECURITY_VERIFICATION: 'Security Verification',
    };

    const purposeLabel = purposeMap[purpose] || 'Security Verification';

    const { htmlContent, textContent } = getOtpTemplate({
      name,
      otpCode,
      purposeLabel,
      expiresMinutes,
    });

    return sendBrevoEmail({
      toEmail,
      toName: name,
      subject: `Your Ardab Market OTP: ${otpCode}`,
      htmlContent,
      textContent,
    });
  }

  /**
   * Dispatches Security Notice when password is changed
   */
  static async sendPasswordChangedNotification({ toEmail, name }) {
    const { htmlContent, textContent } = getPasswordChangedNotificationTemplate({ name });

    return sendBrevoEmail({
      toEmail,
      toName: name,
      subject: 'Security Alert: Ardab Market Password Changed',
      htmlContent,
      textContent,
    });
  }
}
