export const Colors = {
  // Brand colors
  primary: '#00A000',
  primaryDark: '#003B18',
  primaryLight: '#E6F7E6',
  primaryMuted: '#C7EBC7',
  accent: '#00C853',
  accentDark: '#008C3A',
  accentLight: '#E8F5E9',
  secondaryAccent: '#FFB300',
  secondaryAccentLight: '#FFF8E1',

  // Ardab Red (promotional badges, discounts, alerts only)
  ardabRed: '#E60000',
  ardabRedLight: '#FFEAEA',

  // Backgrounds & Surfaces
  background: '#FFFFFF',
  surface: '#F7F9F7',
  surfaceSubtle: '#F0F4F0',
  card: '#FFFFFF',

  // Text
  text: '#111111',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Borders & Dividers
  border: '#E5E7EB',
  borderLight: '#EDF2EE',
  borderFocus: '#00A000',

  // Status & Feedback
  success: '#00A000',
  successLight: '#E6F7E6',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#E60000',
  errorLight: '#FFEAEA',
  info: '#0284C7',
  infoLight: '#E0F2FE',

  // Overlay & Shadows
  overlay: 'rgba(0, 0, 0, 0.45)',
  shimmer: '#E5E7EB',
} as const;

export type ColorName = keyof typeof Colors;
