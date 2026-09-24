import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, Radius, Typography, Spacing } from '@/theme';

export interface BadgeProps {
  label: string;
  variant?: 'primary' | 'accent' | 'secondaryAccent' | 'success' | 'warning' | 'error' | 'neutral';
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  size = 'sm',
  style,
  textStyle,
  icon,
}) => {
  return (
    <View style={[styles.base, styles[variant], styles[`size_${size}`], style]}>
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`], textStyle]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: 4,
  },
  size_sm: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
  },
  size_md: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.md,
  },
  text: {
    fontWeight: Typography.fontWeight.bold,
  },
  textSize_sm: {
    fontSize: Typography.fontSize.tiny,
  },
  textSize_md: {
    fontSize: Typography.fontSize.xs,
  },

  // Variants
  primary: {
    backgroundColor: Colors.primaryLight,
  },
  text_primary: {
    color: Colors.primaryDark,
  },
  accent: {
    backgroundColor: Colors.accentLight,
  },
  text_accent: {
    color: Colors.accentDark,
  },
  secondaryAccent: {
    backgroundColor: Colors.secondaryAccentLight,
  },
  text_secondaryAccent: {
    color: '#B45309',
  },
  success: {
    backgroundColor: Colors.successLight,
  },
  text_success: {
    color: Colors.success,
  },
  warning: {
    backgroundColor: Colors.warningLight,
  },
  text_warning: {
    color: Colors.warning,
  },
  error: {
    backgroundColor: Colors.errorLight,
  },
  text_error: {
    color: Colors.error,
  },
  neutral: {
    backgroundColor: Colors.surfaceSubtle,
  },
  text_neutral: {
    color: Colors.textSecondary,
  },
});
