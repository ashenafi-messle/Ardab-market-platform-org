// ==============================================================================
// Ardab Market - Customer Mobile Auth Validators (Zod)
// ==============================================================================

import { z } from 'zod';
import { AuthResponseCode } from '../utils/responseCodes.js';

export const requestEmailOtpSchema = z.object({
  email: z
    .string({ required_error: AuthResponseCode.MISSING_REQUIRED_FIELD })
    .trim()
    .toLowerCase()
    .email({ message: AuthResponseCode.INVALID_EMAIL }),
  city: z
    .string({ required_error: AuthResponseCode.MISSING_REQUIRED_FIELD })
    .trim()
    .min(1, { message: AuthResponseCode.MISSING_REQUIRED_FIELD }),
  deliveryZone: z.string().trim().optional().nullable(),
});

export const verifyEmailOtpSchema = z.object({
  email: z
    .string({ required_error: AuthResponseCode.MISSING_REQUIRED_FIELD })
    .trim()
    .toLowerCase()
    .email({ message: AuthResponseCode.INVALID_EMAIL }),
  otp: z
    .string({ required_error: AuthResponseCode.MISSING_REQUIRED_FIELD })
    .trim()
    .regex(/^\d{6}$/, { message: AuthResponseCode.INVALID_OTP }),
});

export const requestTelegramOtpSchema = z.object({
  phone: z
    .string({ required_error: AuthResponseCode.MISSING_REQUIRED_FIELD })
    .trim()
    .min(9, { message: AuthResponseCode.INVALID_PHONE }),
  city: z
    .string({ required_error: AuthResponseCode.MISSING_REQUIRED_FIELD })
    .trim()
    .min(1, { message: AuthResponseCode.MISSING_REQUIRED_FIELD }),
  telegramUserId: z.string().trim().optional().nullable(),
  deliveryZone: z.string().trim().optional().nullable(),
});

export const verifyTelegramOtpSchema = z.object({
  phone: z
    .string({ required_error: AuthResponseCode.MISSING_REQUIRED_FIELD })
    .trim()
    .min(9, { message: AuthResponseCode.INVALID_PHONE }),
  otp: z
    .string({ required_error: AuthResponseCode.MISSING_REQUIRED_FIELD })
    .trim()
    .regex(/^\d{6}$/, { message: AuthResponseCode.INVALID_OTP }),
});

export const setPasswordSchema = z
  .object({
    verificationToken: z
      .string({ required_error: AuthResponseCode.MISSING_REQUIRED_FIELD })
      .trim()
      .min(10, { message: AuthResponseCode.INVALID_TOKEN }),
    password: z
      .string({ required_error: AuthResponseCode.MISSING_REQUIRED_FIELD })
      .min(6, { message: AuthResponseCode.PASSWORD_TOO_WEAK }),
    confirmPassword: z.string().optional().nullable(),
    fullName: z.string().trim().optional().nullable(),
    deliveryZone: z.string().trim().optional().nullable(),
    deviceInfo: z.string().trim().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.confirmPassword && data.password !== data.confirmPassword) {
        return false;
      }
      return true;
    },
    {
      message: AuthResponseCode.PASSWORD_MISMATCH,
      path: ['confirmPassword'],
    }
  );

export const mobileLoginSchema = z.object({
  identifier: z
    .string({ required_error: AuthResponseCode.MISSING_REQUIRED_FIELD })
    .trim()
    .min(3, { message: AuthResponseCode.MISSING_REQUIRED_FIELD }),
  password: z
    .string({ required_error: AuthResponseCode.MISSING_REQUIRED_FIELD })
    .min(1, { message: AuthResponseCode.MISSING_REQUIRED_FIELD }),
  deviceInfo: z.string().trim().optional().nullable(),
});

export const mobileRefreshSchema = z.object({
  refreshToken: z
    .string({ required_error: AuthResponseCode.MISSING_REQUIRED_FIELD })
    .trim()
    .min(10, { message: AuthResponseCode.INVALID_REFRESH_TOKEN }),
  deviceInfo: z.string().trim().optional().nullable(),
});

export const forgotPasswordOtpSchema = z.object({
  identifier: z
    .string({ required_error: AuthResponseCode.MISSING_REQUIRED_FIELD })
    .trim()
    .min(3, { message: AuthResponseCode.MISSING_REQUIRED_FIELD }),
});

export const resetPasswordOtpSchema = z
  .object({
    identifier: z
      .string({ required_error: AuthResponseCode.MISSING_REQUIRED_FIELD })
      .trim()
      .min(3, { message: AuthResponseCode.MISSING_REQUIRED_FIELD }),
    otp: z
      .string({ required_error: AuthResponseCode.MISSING_REQUIRED_FIELD })
      .trim()
      .regex(/^\d{6}$/, { message: AuthResponseCode.INVALID_OTP }),
    newPassword: z
      .string({ required_error: AuthResponseCode.MISSING_REQUIRED_FIELD })
      .min(6, { message: AuthResponseCode.PASSWORD_TOO_WEAK }),
    confirmPassword: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.confirmPassword && data.newPassword !== data.confirmPassword) {
        return false;
      }
      return true;
    },
    {
      message: AuthResponseCode.PASSWORD_MISMATCH,
      path: ['confirmPassword'],
    }
  );
