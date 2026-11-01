// ==============================================================================
// Ardab Market - Agent Module Validation Schemas
// ==============================================================================

import { z } from 'zod';

export const requestActivationOtpSchema = z.object({
  email: z.string().trim().email('Valid email address is required').toLowerCase(),
});

export const verifyActivationOtpSchema = z.object({
  email: z.string().trim().email('Valid email address is required').toLowerCase(),
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be a 6-digit numeric code'),
});

export const setPasswordSchema = z
  .object({
    activationToken: z.string().trim().min(1, 'Activation token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().trim(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email address is required').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
  deviceInfo: z.string().optional().nullable(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().trim().min(1, 'Refresh token is required'),
  deviceInfo: z.string().optional().nullable(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Valid email address is required').toLowerCase(),
});

export const verifyResetOtpSchema = z.object({
  email: z.string().trim().email('Valid email address is required').toLowerCase(),
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be a 6-digit numeric code'),
});

export const resetPasswordSchema = z
  .object({
    resetToken: z.string().trim().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().trim(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().trim(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const registerDeviceSchema = z.object({
  expoPushToken: z.string().trim().min(10, 'Valid Expo push token is required'),
  platform: z.enum(['android', 'ios', 'web']).optional(),
  deviceId: z.string().trim().optional().nullable(),
});

export const updateProfileSchema = z.object({
  phone: z.string().trim().min(9, 'Phone number must be at least 9 digits').optional(),
});

