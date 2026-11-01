import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  badge?: React.ReactNode;
  style?: ViewStyle;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = Colors.primary,
  iconBgColor = Colors.primaryLight,
  badge,
  style,
}: StatCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {icon ? (
          <View style={[styles.iconWrapper, { backgroundColor: iconBgColor }]}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
        ) : badge ? (
          <>{badge}</>
        ) : null}
      </View>

      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>

      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: Radius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginVertical: 2,
  },
  subtitle: {
    fontSize: Typography.fontSize.tiny + 1,
    color: Colors.textMuted,
  },
});

