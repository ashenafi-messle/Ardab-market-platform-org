import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/theme';

export interface QuantitySelectorProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md';
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity,
  onIncrease,
  onDecrease,
  min = 1,
  max = 99,
  size = 'md',
}) => {
  const isMin = quantity <= min;
  const isMax = quantity >= max;

  return (
    <View style={[styles.container, styles[`size_${size}`]]}>
      <TouchableOpacity
        onPress={onDecrease}
        activeOpacity={0.7}
        disabled={isMin}
        style={[styles.button, isMin && styles.disabledBtn]}>
        <Ionicons
          name={quantity === 1 ? 'trash-outline' : 'remove'}
          size={size === 'sm' ? 14 : 18}
          color={quantity === 1 ? Colors.error : isMin ? Colors.textMuted : Colors.text}
        />
      </TouchableOpacity>

      <Text style={[styles.quantityText, styles[`text_${size}`]]}>{quantity}</Text>

      <TouchableOpacity
        onPress={onIncrease}
        activeOpacity={0.7}
        disabled={isMax}
        style={[styles.button, isMax && styles.disabledBtn]}>
        <Ionicons
          name="add"
          size={size === 'sm' ? 14 : 18}
          color={isMax ? Colors.textMuted : Colors.primary}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
  size_sm: {
    paddingHorizontal: 4,
    height: 32,
  },
  size_md: {
    paddingHorizontal: 6,
    height: 40,
  },
  button: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    opacity: 0.4,
  },
  quantityText: {
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    color: Colors.text,
    minWidth: 26,
    paddingHorizontal: Spacing.xs,
  },
  text_sm: {
    fontSize: Typography.fontSize.xs,
  },
  text_md: {
    fontSize: Typography.fontSize.base,
  },
});
