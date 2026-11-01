export const Colors = {
  // Brand colors
  primary: '#00A000',
  primaryDark: '#003B18',
  primaryLight: '#E6F7E6',
  primaryMuted: '#C7EBC7',
  accent: '#00C853',
  accentDark: '#008C3A',
  accentLight: '#E8F5E9',

  // Financial & Dashboard Accents
  gold: '#D4AF37',
  goldLight: '#FEF9C3',
  financialDark: '#0A2912',
  financialSurface: '#123D1E',

  // Status Colors
  success: '#00A000',
  successLight: '#E6F7E6',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  info: '#2563EB',
  infoLight: '#EFF6FF',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',

  // Backgrounds & Surfaces
  background: '#FFFFFF',
  surface: '#F8FAF9',
  surfaceSubtle: '#F0F4F1',
  card: '#FFFFFF',

  // Text
  text: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',
  textGold: '#F59E0B',

  // Borders & Dividers
  border: '#E5E7EB',
  borderLight: '#EDF2EE',
  borderFocus: '#00A000',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.45)',
} as const;

export type ColorName = keyof typeof Colors;

