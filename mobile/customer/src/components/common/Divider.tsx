import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing } from '@/theme';

export interface DividerProps {
  vertical?: boolean;
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  color?: string;
  style?: ViewStyle;
}

export const Divider: React.FC<DividerProps> = ({
  vertical = false,
  spacing = 'sm',
  color = Colors.borderLight,
  style,
}) => {
  const marginVal = spacing === 'none' ? 0 : Spacing[spacing];

  if (vertical) {
    return (
      <View
        style={[
          styles.vertical,
          { backgroundColor: color, marginHorizontal: marginVal },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.horizontal,
        { backgroundColor: color, marginVertical: marginVal },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    width: '100%',
  },
  vertical: {
    width: 1,
    height: '100%',
  },
});
