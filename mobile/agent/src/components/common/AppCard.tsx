import React from 'react';
import { View, StyleSheet, ViewStyle, ViewProps } from 'react-native';
import { Colors, Radius, Spacing, Shadows } from '../../theme';

export interface AppCardProps extends ViewProps {
  variant?: 'elevated' | 'outlined' | 'financial' | 'subtle';
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

export function AppCard({ variant = 'elevated', style, children, ...rest }: AppCardProps) {
  return (
    <View style={[styles.base, styles[variant], style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  elevated: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  outlined: {
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  financial: {
    backgroundColor: Colors.financialDark,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)', // subtle gold border
    ...Shadows.md,
  },
  subtle: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
});

