import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '../../theme';
import { AppButton } from './AppButton';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryTitle?: string;
}

export function ErrorState({
  title = 'Something Went Wrong',
  message,
  onRetry,
  retryTitle = 'Try Again',
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="alert-circle-outline" size={36} color={Colors.danger} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <AppButton
          title={retryTitle}
          variant="primary"
          size="sm"
          onPress={onRetry}
          style={styles.retryBtn}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.round,
    backgroundColor: Colors.dangerLight,
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
  retryBtn: {
    marginTop: Spacing.lg,
  },
});

