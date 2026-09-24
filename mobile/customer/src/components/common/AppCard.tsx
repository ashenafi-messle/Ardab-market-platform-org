import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TouchableOpacityProps,
} from 'react-native';
import { Colors, Radius, Spacing, Shadows } from '@/theme';

export interface AppCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'flat' | 'elevated' | 'outlined';
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  padding?: 'none' | 'sm' | 'md' | 'lg';
  activeOpacity?: number;
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  variant = 'default',
  onPress,
  style,
  padding = 'md',
  activeOpacity = 0.85,
}) => {
  const cardStyle = [
    styles.base,
    styles[variant],
    styles[`pad_${padding}`],
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={activeOpacity}
        onPress={onPress}
        style={cardStyle}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  default: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  flat: {
    backgroundColor: Colors.surface,
  },
  elevated: {
    ...Shadows.md,
  },
  outlined: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pad_none: {
    padding: 0,
  },
  pad_sm: {
    padding: Spacing.sm,
  },
  pad_md: {
    padding: Spacing.md,
  },
  pad_lg: {
    padding: Spacing.lg,
  },
});
