// ==============================================================================
// Ardab Market - Branded Email Templates
// ==============================================================================

/**
 * Renders consistent header with Ardab Market Logo mark and typography
 */
function renderBrandHeader() {
  const logoUrl = 'https://res.cloudinary.com/dr9umkixr/image/upload/v1789292515/5841569209974984677_ktnepe.jpg';

  return `
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 28px 24px; text-align: center; border-bottom: 3px solid #10b981;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td valign="middle" style="padding-right: 14px;">
                  <img src="${logoUrl}" alt="Ardab Market Logo" width="52" height="52" style="width: 52px; height: 52px; border-radius: 10px; object-fit: cover; display: block; border: 0; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);" />
                </td>
                <td valign="middle">
                  <span style="font-size: 26px; font-weight: 800; color: #ffffff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; letter-spacing: -0.5px;">
                    Ardab <span style="color: #34d399;">Market</span>
                  </span>
                </td>
              </tr>
            </table>
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; font-weight: 600; margin-top: 8px;">
              Central Operations Platform
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
}

/**
 * Returns Password Reset email templates (HTML & Plain text)
 */
export function getPasswordResetTemplate({ name, resetUrl, expiresMinutes = 15, title = 'Password Reset', isCustomer = false }) {
  const recipientName = name || (isCustomer ? 'Customer' : 'Administrator');
  const greetingRole = isCustomer ? 'customer account' : 'administrative account';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ardab Market Password Reset</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
        .content { padding: 32px; color: #334155; line-height: 1.6; }
        .btn { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #0d9488 100%); color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; margin: 20px 0; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        .warning { background-color: #fff7ed; border-left: 4px solid #f97316; padding: 14px 16px; margin-top: 24px; border-radius: 0 6px 6px 0; font-size: 13px; color: #9a3412; }
      </style>
    </head>
    <body>
      <div class="container">
        ${renderBrandHeader()}
        <div class="content">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">${title}</h2>
          <p>Hello <strong>${recipientName}</strong>,</p>
          <p>We received a request to reset your ${greetingRole} password for the <strong>Ardab Market Platform</strong>.</p>
          <p>Click the button below to set your new security credentials. This link is valid for <strong>${expiresMinutes} minutes</strong>:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="btn">Reset Password</a>
          </p>
          <p style="font-size: 13px; color: #64748b; word-break: break-all;">
            If the button above does not work, copy and paste this direct link into your browser:<br>
            <a href="${resetUrl}" style="color: #0d9488;">${resetUrl}</a>
          </p>
          <div class="warning">
            <strong>Security Notice:</strong> If you did not request a password reset, please ignore this email or notify security support immediately.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Ardab Market Platform. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Ardab Market - Administrative Password Reset

Hello ${recipientName},

We received a request to reset your administrative account password for the Ardab Market Platform.

Reset link (${expiresMinutes} mins validity):
${resetUrl}

If you did not request this reset, please ignore this message.
  `.trim();

  return { htmlContent, textContent };
}

/**
 * Returns OTP Verification email templates (HTML & Plain text)
 */
export function getOtpTemplate({ name, otpCode, purposeLabel = 'Security Verification', expiresMinutes = 10 }) {
  const recipientName = name || 'Administrator';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ardab Market Security Verification</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
        .content { padding: 32px; color: #334155; line-height: 1.6; }
        .otp-box { background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #0f172a; margin: 24px 0; font-family: 'Courier New', monospace; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        .warning { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; margin-top: 24px; border-radius: 0 6px 6px 0; font-size: 13px; color: #991b1b; }
      </style>
    </head>
    <body>
      <div class="container">
        ${renderBrandHeader()}
        <div class="content">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">${purposeLabel}</h2>
          <p>Hello <strong>${recipientName}</strong>,</p>
          <p>Your One-Time Password (OTP) for <strong>${purposeLabel}</strong> is:</p>
          <div class="otp-box">${otpCode}</div>
          <p>This code is valid for <strong>${expiresMinutes} minutes</strong> and can only be used once.</p>
          <div class="warning">
            <strong>Security Notice:</strong> Never share this verification code with anyone. Ardab Market support will never ask for your OTP.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Ardab Market Platform. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Ardab Market - ${purposeLabel}

Hello ${recipientName},

Your One-Time Password (OTP) is: ${otpCode}

Valid for ${expiresMinutes} minutes. Never share this code with anyone.
  `.trim();

  return { htmlContent, textContent };
}

/**
 * Returns Customer Email Verification Link email template (HTML & Plain text)
 * Dedicated link template - STRICTLY NO OTP CODE
 */
export function getEmailVerificationLinkTemplate({ name, verificationUrl, expiresMinutes = 1440 }) {
  const recipientName = name || 'Valued Customer';
  const hours = Math.round(expiresMinutes / 60);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Ardab Market Email</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
        .content { padding: 36px 32px; color: #334155; line-height: 1.6; }
        .btn { display: inline-block; background: linear-gradient(135deg, #108A4E 0%, #0B6B3C 100%); color: #ffffff !important; padding: 15px 36px; text-decoration: none; border-radius: 9999px; font-weight: 700; font-size: 16px; margin: 24px 0; box-shadow: 0 4px 12px rgba(16, 138, 78, 0.35); text-align: center; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        .notice { background-color: #f0fdf4; border-left: 4px solid #108A4E; padding: 14px 16px; margin-top: 24px; border-radius: 0 6px 6px 0; font-size: 13px; color: #166534; }
      </style>
    </head>
    <body>
      <div class="container">
        ${renderBrandHeader()}
        <div class="content">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 22px; font-weight: 800;">Verify Your Email Address</h2>
          <p style="font-size: 15px;">Hello <strong>${recipientName}</strong>,</p>
          <p style="font-size: 15px; color: #475569;">
            Thank you for creating an account on <strong>Ardab Market</strong>. Please click the button below to verify your email address and continue setting up your password:
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${verificationUrl}" class="btn" target="_blank" rel="noopener noreferrer">
              Verify Email Address
            </a>
          </div>
          <div class="notice">
            <strong>Security Note:</strong> This verification link will remain active for <strong>${hours} hours</strong>. If you did not sign up for Ardab Market, you can safely ignore this email.
          </div>
          <p style="font-size: 12px; color: #64748b; word-break: break-all; margin-top: 24px;">
            If the button above does not work, copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #108A4E;">${verificationUrl}</a>
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Ardab Market Platform. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Ardab Market - Verify Your Email Address

Hello ${recipientName},

Thank you for creating an account on Ardab Market.
Please verify your email address by opening this link:

${verificationUrl}

This link is valid for ${hours} hours.
If you did not create this account, please ignore this email.
  `.trim();

  return { htmlContent, textContent };
}

/**
 * Returns Password Changed notification template
 */
export function getPasswordChangedNotificationTemplate({ name }) {
  const recipientName = name || 'Administrator';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ardab Market Password Updated</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
        .content { padding: 32px; color: #334155; line-height: 1.6; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        ${renderBrandHeader()}
        <div class="content">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Password Changed Successfully</h2>
          <p>Hello <strong>${recipientName}</strong>,</p>
          <p>Your administrative account password for <strong>Ardab Market</strong> was successfully updated.</p>
          <p>All previous active login sessions have been automatically terminated for your security.</p>
          <p>If you did not perform this change, please contact security support immediately.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Ardab Market Platform. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Ardab Market - Password Changed

Hello ${recipientName},

Your administrative account password was successfully updated and all active sessions were terminated.
If you did not make this change, contact support immediately.
  `.trim();

  return { htmlContent, textContent };
}
