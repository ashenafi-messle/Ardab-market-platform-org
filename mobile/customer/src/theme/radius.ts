export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
  round: 9999,
} as const;

export type RadiusKey = keyof typeof Radius;
