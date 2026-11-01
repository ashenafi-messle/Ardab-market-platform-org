import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Typography, Spacing } from '../../theme';

export interface BadgeProps {
  label: string;
  variant?: 'success' | 'warning' | 'info' | 'danger' | 'gold' | 'neutral';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Badge({ label, variant = 'neutral', size = 'sm', style }: BadgeProps) {
  return (
    <View style={[styles.base, styles[variant], styles[`size_${size}`], style]}>
      <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`]]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  size_sm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  size_md: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  success: {
    backgroundColor: Colors.successLight,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  warning: {
    backgroundColor: Colors.warningLight,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  info: {
    backgroundColor: Colors.infoLight,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  danger: {
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  gold: {
    backgroundColor: Colors.goldLight,
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  neutral: {
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: {
    fontWeight: Typography.fontWeight.semibold,
  },
  textSize_sm: {
    fontSize: Typography.fontSize.tiny,
  },
  textSize_md: {
    fontSize: Typography.fontSize.xs,
  },
  text_success: {
    color: '#065F46',
  },
  text_warning: {
    color: '#92400E',
  },
  text_info: {
    color: '#1E40AF',
  },
  text_danger: {
    color: '#991B1B',
  },
  text_gold: {
    color: '#854D0E',
  },
  text_neutral: {
    color: Colors.textSecondary,
  },
});

