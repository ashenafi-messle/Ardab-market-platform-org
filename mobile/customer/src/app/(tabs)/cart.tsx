import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/theme';
import { useApp } from '@/store';
import { t } from '@/utils/i18n';
import { CartItem, CartSummary } from '@/components/cart';
import { EmptyState } from '@/components/common';

export default function CartScreen() {
  const router = useRouter();
  const {
    cartItems,
    updateCartQuantity,
    removeFromCart,
    toggleCartItemSelect,
    selectAllCartItems,
    cartSubtotal,
    cartTotal,
  } = useApp();

  const selectedCount = cartItems.filter((i) => i.selected).length;
  const isAllSelected = cartItems.length > 0 && selectedCount === cartItems.length;

  const handleCheckout = () => {
    router.push('/checkout' as any);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('cart.title')}</Text>
        {cartItems.length > 0 ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => selectAllCartItems(!isAllSelected)}
            style={styles.selectAllBtn}>
            <Ionicons
              name={isAllSelected ? 'checkbox' : 'square-outline'}
              size={20}
              color={isAllSelected ? Colors.primary : Colors.textMuted}
            />
            <Text style={styles.selectAllText}>{t('cart.selectAll')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Cart Content */}
      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="cart-outline"
            title={t('cart.empty')}
            message={t('cart.emptySub')}
            actionTitle={t('cart.startShopping')}
            onAction={() => router.push('/(tabs)' as any)}
          />
        </View>
      ) : (
        <View style={styles.listContainer}>
          <FlatList
            data={cartItems}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <CartItem
                item={item}
                onQuantityChange={(qty) => updateCartQuantity(item.product.id, qty)}
                onRemove={() => removeFromCart(item.product.id)}
                onToggleSelect={() => toggleCartItemSelect(item.product.id)}
                onPressProduct={() => router.push(`/products/${item.product.id}` as any)}
              />
            )}
          />

          {/* Sticky Bottom Summary */}
          <CartSummary
            subtotal={cartSubtotal}
            deliveryFee={selectedCount > 0 ? 150 : 0}
            total={cartTotal}
            itemCount={selectedCount}
            disabled={selectedCount === 0}
            onCheckout={handleCheckout}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectAllText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
});
