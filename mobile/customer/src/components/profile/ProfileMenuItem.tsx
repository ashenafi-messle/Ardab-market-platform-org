import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/theme';

export interface ProfileMenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  badge?: string | number;
  onPress: () => void;
  isDestructive?: boolean;
  showChevron?: boolean;
}

export const ProfileMenuItem: React.FC<ProfileMenuItemProps> = ({
  icon,
  title,
  subtitle,
  badge,
  onPress,
  isDestructive = false,
  showChevron = true,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.item}>
      <View
        style={[
          styles.iconContainer,
          isDestructive ? styles.iconContainerDestructive : styles.iconContainerDefault,
        ]}>
        <Ionicons
          name={icon}
          size={20}
          color={isDestructive ? Colors.error : Colors.primary}
        />
      </View>

      <View style={styles.textContainer}>
        <Text style={[styles.title, isDestructive && styles.destructiveTitle]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      {badge !== undefined ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}

      {showChevron ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={Colors.textMuted}
          style={styles.chevron}
        />
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerDefault: {
    backgroundColor: Colors.primaryLight,
  },
  iconContainerDestructive: {
    backgroundColor: Colors.errorLight,
  },
  textContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  destructiveTitle: {
    color: Colors.error,
  },
  subtitle: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    marginRight: Spacing.xs,
  },
  badgeText: {
    fontSize: Typography.fontSize.tiny,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  chevron: {
    marginLeft: Spacing.xs,
  },
});
