import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Colors, Radius, Typography, Spacing } from '@/theme';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  count?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  icon,
  count,
  style,
  textStyle,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.chip,
        selected ? styles.chipSelected : styles.chipUnselected,
        style,
      ]}>
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text
        style={[
          styles.label,
          selected ? styles.labelSelected : styles.labelUnselected,
          textStyle,
        ]}>
        {label}
      </Text>
      {count !== undefined ? (
        <View
          style={[
            styles.countBadge,
            selected ? styles.countBadgeSelected : styles.countBadgeUnselected,
          ]}>
          <Text
            style={[
              styles.countText,
              selected ? styles.countTextSelected : styles.countTextUnselected,
            ]}>
            {count}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  chipUnselected: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  iconContainer: {
    marginRight: Spacing.xs,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  labelUnselected: {
    color: Colors.text,
  },
  labelSelected: {
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.bold,
  },
  countBadge: {
    marginLeft: Spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  countBadgeUnselected: {
    backgroundColor: Colors.borderLight,
  },
  countBadgeSelected: {
    backgroundColor: Colors.primary,
  },
  countText: {
    fontSize: Typography.fontSize.tiny,
    fontWeight: Typography.fontWeight.bold,
  },
  countTextUnselected: {
    color: Colors.textSecondary,
  },
  countTextSelected: {
    color: Colors.textInverse,
  },
});
