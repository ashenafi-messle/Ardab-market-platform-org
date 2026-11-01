import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '../../theme';
import { AppButton } from './AppButton';

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionTitle?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  actionTitle,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={36} color={Colors.textMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionTitle && onAction ? (
        <AppButton
          title={actionTitle}
          variant="outline"
          size="sm"
          onPress={onAction}
          style={styles.actionBtn}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 1.5,
    paddingHorizontal: Spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.round,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.md + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  message: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionBtn: {
    marginTop: Spacing.lg,
  },
});

