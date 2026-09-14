// ==============================================================================
// Ardab Market - Admin Authentication Request Validators
// ==============================================================================

import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid administrative email address')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters long'),
  rememberMe: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid administrative email address')
    .toLowerCase(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string({ required_error: 'Reset token is required' }).trim().min(1, 'Token cannot be empty'),
    password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
    newPassword: z.string().min(8, 'Password must be at least 8 characters long').optional(),
    confirmPassword: z
      .string({ required_error: 'Confirm password is required' })
      .min(8, 'Confirm password must be at least 8 characters long'),
  })
  .refine((data) => {
    const targetPassword = data.newPassword || data.password;
    return targetPassword && targetPassword === data.confirmPassword;
  }, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const requestOtpSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid administrative email address')
    .toLowerCase(),
  purpose: z
    .enum(['LOGIN_VERIFICATION', 'PASSWORD_RESET', 'EMAIL_VERIFICATION', 'SECURITY_VERIFICATION'])
    .optional()
    .default('SECURITY_VERIFICATION'),
});

export const verifyOtpSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid administrative email address')
    .toLowerCase(),
  code: z
    .string({ required_error: 'Verification code is required' })
    .trim()
    .length(6, 'Verification code must be exactly 6 digits'),
  purpose: z
    .enum(['LOGIN_VERIFICATION', 'PASSWORD_RESET', 'EMAIL_VERIFICATION', 'SECURITY_VERIFICATION'])
    .optional()
    .default('SECURITY_VERIFICATION'),
});

