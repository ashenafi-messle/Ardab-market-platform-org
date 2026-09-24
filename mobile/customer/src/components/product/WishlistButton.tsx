import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadows } from '@/theme';

export interface WishlistButtonProps {
  isFavorite: boolean;
  onPress: () => void;
  size?: number;
  style?: ViewStyle;
}

export const WishlistButton: React.FC<WishlistButtonProps> = ({
  isFavorite,
  onPress,
  size = 20,
  style,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.button, style]}>
      <Ionicons
        name={isFavorite ? 'heart' : 'heart-outline'}
        size={size}
        color={isFavorite ? Colors.error : Colors.textSecondary}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
});
