/**
 * Format a numeric amount into Ethiopian Birr standard presentation:
 * e.g. ETB 2,450.00
 */
export function formatETB(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) {
    return 'ETB 0.00';
  }

  const parts = amount.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const decPart = parts[1];

  return `ETB ${intPart}.${decPart}`;
}

/**
 * Format raw number with comma separators without currency prefix
 */
export function formatNumber(val: number | null | undefined): string {
  if (val == null || isNaN(val)) {
    return '0';
  }
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

