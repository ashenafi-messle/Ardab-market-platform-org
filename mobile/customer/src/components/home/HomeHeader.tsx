import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { useApp } from '@/store';
import { ArdabLogo } from '../common/ArdabLogo';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { t } from '@/localization';

export interface HomeHeaderProps {
  onSearchPress?: () => void;
  onLogoPress?: () => void;
  hasUnreadNotifications?: boolean;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  onSearchPress,
  onLogoPress,
  hasUnreadNotifications = true,
}) => {
  const router = useRouter();
  const { cartCount, language } = useApp();

  const handleSearch = () => {
    if (onSearchPress) {
      onSearchPress();
    } else {
      router.push('/products/search' as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Ardab Logo Left with category drawer trigger */}
      <AnimatedPressable
        scaleTo={0.95}
        accessibilityRole="button"
        accessibilityLabel="Open category menu"
        onPress={onLogoPress ? onLogoPress : () => router.push('/(tabs)' as any)}
        style={styles.logoWrapper}>
        <ArdabLogo size="md" />
      </AnimatedPressable>

      {/* 2. Search Bar Center */}
      <AnimatedPressable
        scaleTo={0.98}
        accessibilityLabel={t('home.searchPlaceholder')}
        onPress={handleSearch}
        style={styles.searchBar}>
        <Ionicons
          name="search-outline"
          size={18}
          color={Colors.primary}
          style={styles.searchIcon}
        />
        <Text style={styles.searchPlaceholder} numberOfLines={1}>
          {t('home.searchPlaceholder')}
        </Text>
      </AnimatedPressable>

      {/* 3. Language Switcher Pill */}
      <LanguageSwitcher compact />

      {/* 4. Notification Icon */}
      <TouchableOpacity
        activeOpacity={0.75}
        accessibilityLabel={t('nav.notifications')}
        onPress={() => router.push('/profile/notifications' as any)}
        style={styles.iconBtn}>
        <Ionicons name="notifications-outline" size={20} color={Colors.text} />
        {hasUnreadNotifications ? <View style={styles.redDot} /> : null}
      </TouchableOpacity>

      {/* 5. Cart Icon */}
      <TouchableOpacity
        activeOpacity={0.75}
        accessibilityLabel={t('nav.cart')}
        onPress={() => router.push('/(tabs)/cart' as any)}
        style={styles.iconBtn}>
        <Ionicons name="cart-outline" size={20} color={Colors.text} />
        {cartCount > 0 ? (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>
              {cartCount > 99 ? '99+' : cartCount}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  logoWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    height: 42,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.xs + 2,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.ardabRed,
    position: 'absolute',
    top: 7,
    right: 8,
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.ardabRed,
    borderRadius: 10,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  cartBadgeText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
});
