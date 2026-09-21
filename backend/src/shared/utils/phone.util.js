// ==============================================================================
// Ardab Market - Ethiopian Phone Normalization Utility
// ==============================================================================

/**
 * Normalizes an Ethiopian phone number to canonical E.164 (+251...) and standard local (09.../07...) formats.
 * Supports numbers starting with:
 *   +251 9...
 *   251 9...
 *   09...
 *   07...
 *   9...
 *   7...
 *
 * @param {string} rawPhone - Raw phone string from user input or database
 * @returns {{ e164: string, local: string, isValid: boolean, variants: string[] }}
 */
export function normalizeEthiopianPhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { e164: '', local: '', isValid: false, variants: [] };
  }

  // Remove whitespace, hyphens, parentheses, and dots
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '');

  // Strip leading 00 if present (international dialing prefix)
  if (cleaned.startsWith('00251')) {
    cleaned = '+251' + cleaned.slice(5);
  } else if (cleaned.startsWith('251')) {
    cleaned = '+251' + cleaned.slice(3);
  }

  let localNumber = '';

  if (cleaned.startsWith('+251')) {
    const afterCode = cleaned.slice(4);
    if (afterCode.startsWith('9') || afterCode.startsWith('7')) {
      localNumber = '0' + afterCode;
    }
  } else if (cleaned.startsWith('09') || cleaned.startsWith('07')) {
    localNumber = cleaned;
  } else if ((cleaned.startsWith('9') || cleaned.startsWith('7')) && cleaned.length === 9) {
    localNumber = '0' + cleaned;
  }

  // Valid Ethiopian mobile numbers have 10 digits in local format: 09XXXXXXXX or 07XXXXXXXX
  const isValid = /^0(9|7)\d{8}$/.test(localNumber);

  if (!isValid) {
    return {
      e164: cleaned,
      local: cleaned,
      isValid: false,
      variants: [cleaned],
    };
  }

  const nationalSuffix = localNumber.slice(1); // 9XXXXXXXX or 7XXXXXXXX
  const e164 = `+251${nationalSuffix}`;
  const raw251 = `251${nationalSuffix}`;
  const local = localNumber; // 09XXXXXXXX

  // Collect all valid representations for resilient DB matching
  const variants = Array.from(new Set([e164, local, raw251, nationalSuffix]));

  return {
    e164,
    local,
    isValid: true,
    variants,
  };
}
