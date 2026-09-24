import { ViewStyle, Platform } from 'react-native';

export const Shadows: Record<'none' | 'sm' | 'md' | 'lg', ViewStyle> = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: Platform.select({
    web: {
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
    } as any,
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
  }),
  md: Platform.select({
    web: {
      boxShadow: '0 4px 14px rgba(20, 90, 70, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
    } as any,
    default: {
      shadowColor: '#145A46',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 3,
    },
  }),
  lg: Platform.select({
    web: {
      boxShadow: '0 10px 25px rgba(20, 90, 70, 0.12), 0 4px 10px rgba(0, 0, 0, 0.06)',
    } as any,
    default: {
      shadowColor: '#145A46',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.14,
      shadowRadius: 12,
      elevation: 6,
    },
  }),
};
