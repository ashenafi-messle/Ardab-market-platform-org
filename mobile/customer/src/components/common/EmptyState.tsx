import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@/theme';
import { AppText } from './AppText';
import { AppButton } from './AppButton';

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'basket-outline',
  title,
  message,
  actionTitle,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={48} color={Colors.primary} />
      </View>
      <AppText variant="subtitle" weight="bold" align="center" style={styles.title}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="caption" color={Colors.textSecondary} align="center" style={styles.message}>
          {message}
        </AppText>
      ) : null}
      {actionTitle && onAction ? (
        <AppButton
          title={actionTitle}
          onPress={onAction}
          variant="primary"
          size="md"
          fullWidth={false}
          style={styles.actionBtn}
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
    width: 90,
    height: 90,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryLight,
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
  actionBtn: {
    minWidth: 160,
  },
});
