import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Typography, Spacing } from '@/theme';

export interface DiscountBadgeProps {
  percentage: number;
  style?: ViewStyle;
}

export const DiscountBadge: React.FC<DiscountBadgeProps> = ({ percentage, style }) => {
  if (!percentage || percentage <= 0) return null;

  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.text}>-{percentage}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.tiny,
    fontWeight: Typography.fontWeight.bold,
  },
});
