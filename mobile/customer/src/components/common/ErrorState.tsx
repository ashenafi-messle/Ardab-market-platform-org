import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@/theme';
import { AppText } from './AppText';
import { AppButton } from './AppButton';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'We could not load the data. Please check your internet connection and try again.',
  onRetry,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Ionicons name="alert-circle-outline" size={44} color={Colors.error} />
      </View>
      <AppText variant="subtitle" weight="bold" align="center" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="caption" color={Colors.textSecondary} align="center" style={styles.message}>
        {message}
      </AppText>
      {onRetry ? (
        <AppButton
          title="Retry"
          onPress={onRetry}
          variant="outline"
          size="md"
          fullWidth={false}
          style={styles.retryBtn}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: Radius.pill,
    backgroundColor: Colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  message: {
    maxWidth: 280,
    marginBottom: Spacing.xl,
  },
  retryBtn: {
    minWidth: 140,
  },
});
