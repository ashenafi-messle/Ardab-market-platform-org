import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '../../theme';

export interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  helperText?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

export function AppInput({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  secureTextEntry,
  containerStyle,
  style,
  ...rest
}: AppInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isSecure = secureTextEntry && !isPasswordVisible;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.focused,
          Boolean(error) && styles.errorBorder,
        ]}
      >
        {leftIcon ? (
          <Ionicons
            name={leftIcon}
            size={20}
            color={error ? Colors.danger : isFocused ? Colors.primary : Colors.textMuted}
            style={styles.leftIcon}
          />
        ) : null}

        <TextInput
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={isSecure}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[styles.input, style]}
          {...rest}
        />

        {secureTextEntry ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsPasswordVisible((prev) => !prev)}
            style={styles.rightIconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={styles.rightIconButton}
          >
            <Ionicons name={rightIcon} size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text,
    marginBottom: Spacing.xs + 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 50,
  },
  focused: {
    borderColor: Colors.primary,
  },
  errorBorder: {
    borderColor: Colors.danger,
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.sm + 1,
    color: Colors.text,
    paddingVertical: Spacing.sm,
  },
  rightIconButton: {
    marginLeft: Spacing.sm,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  errorText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.danger,
    fontWeight: Typography.fontWeight.medium,
  },
  helperText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
});

