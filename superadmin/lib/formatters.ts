import { PLATFORM_CURRENCY, STANDARD_WEIGHT_UNIT, STANDARD_FLEET_CAPACITY_KG } from './constants';

/**
 * Centralized formatting utilities for consistent UI presentation across all modules.
 */

/**
 * Format monetary amount with standard Ethiopian Birr currency symbol.
 * Example: 850 -> "850 ETB" or 12500.5 -> "12,500.50 ETB"
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return `0 ${PLATFORM_CURRENCY}`;
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${PLATFORM_CURRENCY}`;
}

/**
 * Format weight in kilograms.
 * Example: 4350 -> "4,350 KG"
 */
export function formatWeight(kg: number): string {
  if (isNaN(kg) || kg === null || kg === undefined) return `0 ${STANDARD_WEIGHT_UNIT}`;
  return `${kg.toLocaleString('en-US')} ${STANDARD_WEIGHT_UNIT}`;
}

/**
 * Format capacity utilization comparison.
 * Example: (4350, 5000) -> "4,350 / 5,000 KG (87%)"
 */
export function formatCapacity(currentKg: number, maxKg: number = STANDARD_FLEET_CAPACITY_KG): string {
  const safeCurrent = Math.max(0, currentKg || 0);
  const safeMax = Math.max(1, maxKg || STANDARD_FLEET_CAPACITY_KG);
  const percent = Math.round((safeCurrent / safeMax) * 100);
  return `${safeCurrent.toLocaleString('en-US')} / ${safeMax.toLocaleString('en-US')} ${STANDARD_WEIGHT_UNIT} (${percent}%)`;
}

/**
 * Format ISO or date string to readable format.
 * Example: "2025-03-12T10:30:00Z" -> "Mar 12, 2025"
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; // Return raw string if already formatted
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format date with time.
 * Example: "Mar 12, 2025, 10:30 AM"
 */
export function formatDateTime(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Privacy-friendly phone number masking for sensitive views.
 * Example: "+251 91 123 4567" -> "+251 91 ••• 4567"
 */
export function maskPhoneNumber(phone?: string): string {
  if (!phone) return 'N/A';
  const clean = phone.trim();
  if (clean.length <= 6) return clean;
  // Keep country/prefix and last 4 digits
  const parts = clean.split(' ');
  if (parts.length >= 3) {
    return `${parts[0]} ${parts[1]} ••• ${parts[parts.length - 1]}`;
  }
  return clean.replace(/(\d{4})\d+(\d{4})/, '$1 ••• $2');
}

/**
 * Format snake_case or SCREAMING_SNAKE_CASE status enum into Title Case.
 * Example: "READY_FOR_DELIVERY" -> "Ready For Delivery"
 */
export function formatStatus(status: string): string {
  if (!status) return '';
  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
