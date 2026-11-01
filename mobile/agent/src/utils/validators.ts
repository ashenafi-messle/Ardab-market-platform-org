/**
 * Validation utilities for Agent authentication and forms
 */

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export interface PasswordStrength {
  score: number; // 0 to 4
  label: 'Too Weak' | 'Weak' | 'Medium' | 'Strong' | 'Very Strong';
  color: string;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (hasMinLength) score++;
  if (hasUppercase && hasLowercase) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  let label: PasswordStrength['label'] = 'Too Weak';
  let color = '#EF4444'; // Red

  if (score === 1) {
    label = 'Weak';
    color = '#F97316'; // Orange
  } else if (score === 2) {
    label = 'Medium';
    color = '#F59E0B'; // Amber
  } else if (score === 3) {
    label = 'Strong';
    color = '#10B981'; // Emerald
  } else if (score === 4) {
    label = 'Very Strong';
    color = '#00A000'; // Brand green
  }

  return {
    score,
    label,
    color,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
  };
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.substring(0, 2)}***${local.slice(-1)}@${domain}`;
}

