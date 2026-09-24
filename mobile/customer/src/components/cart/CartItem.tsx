import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { CartItem as CartItemType } from '@/types';
import { formatPrice } from '@/utils/i18n';
import { QuantitySelector } from '../common/QuantitySelector';

export interface CartItemProps {
  item: CartItemType;
  onQuantityChange: (qty: number) => void;
  onRemove: () => void;
  onToggleSelect: () => void;
  onPressProduct?: () => void;
}

export const CartItem: React.FC<CartItemProps> = ({
  item,
  onQuantityChange,
  onRemove,
  onToggleSelect,
  onPressProduct,
}) => {
  const { product, quantity, selected, selectedAttributes } = item;

  const attrText = selectedAttributes
    ? Object.entries(selectedAttributes)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' • ')
    : null;

  return (
    <View style={styles.container}>
      {/* Checkbox */}
      <TouchableOpacity
        onPress={onToggleSelect}
        activeOpacity={0.7}
        style={styles.checkboxWrapper}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons
          name={selected ? 'checkbox' : 'square-outline'}
          size={22}
          color={selected ? Colors.primary : Colors.textMuted}
        />
      </TouchableOpacity>

      {/* Product Image */}
      <TouchableOpacity
        onPress={onPressProduct}
        activeOpacity={0.8}
        style={styles.imageWrapper}>
        <Image source={{ uri: product.images[0] }} style={styles.image} resizeMode="cover" />
      </TouchableOpacity>

      {/* Product Info & Actions */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={onPressProduct} style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={2}>
              {product.name}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onRemove}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>

        {attrText ? (
          <Text style={styles.attributes} numberOfLines={1}>
            {attrText}
          </Text>
        ) : null}

        <View style={styles.bottomRow}>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
          <QuantitySelector
            quantity={quantity}
            onIncrease={() => onQuantityChange(quantity + 1)}
            onDecrease={() => onQuantityChange(quantity - 1)}
            size="sm"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  checkboxWrapper: {
    marginRight: Spacing.sm,
  },
  imageWrapper: {
    width: 80,
    height: 80,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'space-between',
    minHeight: 80,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    lineHeight: 18,
  },
  deleteBtn: {
    padding: 2,
  },
  attributes: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  price: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.primary,
  },
});
