import React from 'react';
import { Text, StyleSheet, TextProps, TextStyle } from 'react-native';
import { Colors, Typography } from '@/theme';

export interface AppTextProps extends TextProps {
  variant?: 'hero' | 'display' | 'title' | 'subtitle' | 'body' | 'caption' | 'tiny' | 'price';
  color?: string;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold' | 'heavy';
  align?: 'left' | 'center' | 'right';
  style?: TextStyle | TextStyle[];
  children: React.ReactNode;
}

export const AppText: React.FC<AppTextProps> = ({
  variant = 'body',
  color,
  weight,
  align = 'left',
  style,
  children,
  ...rest
}) => {
  return (
    <Text
      style={[
        styles.base,
        styles[variant],
        color ? { color } : undefined,
        weight ? { fontWeight: Typography.fontWeight[weight] } : undefined,
        align ? { textAlign: align } : undefined,
        style,
      ]}
      {...rest}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    color: Colors.text,
  },
  hero: {
    fontSize: Typography.fontSize.hero,
    fontWeight: Typography.fontWeight.heavy,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  display: {
    fontSize: Typography.fontSize.display,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: 22,
    color: Colors.text,
  },
  body: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.regular,
    lineHeight: 20,
    color: Colors.text,
  },
  caption: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  tiny: {
    fontSize: Typography.fontSize.tiny,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: 14,
    color: Colors.textMuted,
  },
  price: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.primary,
  },
});
