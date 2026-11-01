import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { Colors, Radius, Typography, Spacing } from '../../theme';

export interface AppButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
}

export function AppButton({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  style,
  textStyle,
  onPress,
  ...rest
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      onPress={onPress}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'outline' || variant === 'ghost'
              ? Colors.primary
              : Colors.textInverse
          }
        />
      ) : (
        <>
          {icon ? <>{icon}</> : null}
          <Text
            style={[
              styles.textBase,
              styles[`text_${variant}`],
              styles[`textSize_${size}`],
              icon ? styles.textWithIcon : null,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  size_sm: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    minHeight: 36,
  },
  size_md: {
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.lg,
    minHeight: 48,
  },
  size_lg: {
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xl,
    minHeight: 56,
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.primaryDark,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: Colors.danger,
  },
  gold: {
    backgroundColor: Colors.gold,
  },
  disabled: {
    opacity: 0.5,
  },
  textBase: {
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
  textSize_sm: {
    fontSize: Typography.fontSize.xs + 1,
  },
  textSize_md: {
    fontSize: Typography.fontSize.sm + 1,
  },
  textSize_lg: {
    fontSize: Typography.fontSize.md,
  },
  text_primary: {
    color: Colors.textInverse,
  },
  text_secondary: {
    color: Colors.textInverse,
  },
  text_outline: {
    color: Colors.primary,
  },
  text_ghost: {
    color: Colors.primary,
  },
  text_danger: {
    color: Colors.textInverse,
  },
  text_gold: {
    color: Colors.text,
    fontWeight: Typography.fontWeight.bold,
  },
  textWithIcon: {
    marginLeft: Spacing.xs + 2,
  },
});

