import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { useApp } from '@/store';
import { ArdabLogo } from '../common/ArdabLogo';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { t, Language } from '@/localization';

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
  const { cartCount, language, changeLanguage } = useApp();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangSubmenuOpen, setIsLangSubmenuOpen] = useState(false);

  const handleSearch = () => {
    if (onSearchPress) {
      onSearchPress();
    } else {
      router.push('/products/search' as any);
    }
  };

  const handleOpenMenu = () => {
    setIsLangSubmenuOpen(false);
    setIsMenuOpen(true);
  };

  const handleCloseMenu = () => {
    setIsMenuOpen(false);
    setIsLangSubmenuOpen(false);
  };

  const navigateToNotifications = () => {
    handleCloseMenu();
    router.push('/profile/notifications' as any);
  };

  const navigateToCart = () => {
    handleCloseMenu();
    router.push('/(tabs)/cart' as any);
  };

  const handleSelectLanguage = (newLang: Language) => {
    if (newLang !== language) {
      changeLanguage(newLang);
    }
    handleCloseMenu();
  };

  const hasActivityIndicator = hasUnreadNotifications || cartCount > 0;

  return (
    <View style={styles.container}>
      {/* 1. Ardab Logo Left (Category drawer trigger) */}
      <AnimatedPressable
        scaleTo={0.95}
        accessibilityRole="button"
        accessibilityLabel="Open category menu"
        onPress={onLogoPress ? onLogoPress : () => router.push('/(tabs)' as any)}
        style={styles.logoWrapper}>
        <ArdabLogo size="md" />
      </AnimatedPressable>

      {/* 2. Flexible Responsive Search Bar Center */}
      <AnimatedPressable
        scaleTo={0.98}
        accessibilityRole="button"
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

      {/* 3. Combined Single Menu Button Right */}
      <TouchableOpacity
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={t('home.quickMenu') || 'Quick Menu'}
        onPress={handleOpenMenu}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        style={styles.menuTriggerBtn}>
        <Ionicons name="ellipsis-vertical" size={20} color={Colors.text} />
        {hasActivityIndicator ? (
          <View style={styles.triggerBadgeDot} />
        ) : null}
      </TouchableOpacity>

      {/* 4. Quick Menu Dropdown / Modal */}
      <Modal
        visible={isMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCloseMenu}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={handleCloseMenu}>
          <SafeAreaView style={styles.modalSafeArea} edges={['top', 'right']}>
            <Pressable
              style={styles.menuCard}
              onPress={(e) => e.stopPropagation?.()}>
              {/* Menu Card Header */}
              <View style={styles.menuHeader}>
                <View style={styles.menuTitleRow}>
                  <View style={styles.menuTitleIconBubble}>
                    <Ionicons name="grid-outline" size={16} color={Colors.primary} />
                  </View>
                  <Text style={styles.menuTitle}>
                    {t('home.quickMenu') || 'Quick Menu'}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleCloseMenu}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.closeBtn}
                  accessibilityLabel="Close">
                  <Ionicons name="close" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Menu Item 1: Notifications */}
              <TouchableOpacity
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`${t('nav.notifications')}${hasUnreadNotifications ? ', unread' : ''}`}
                onPress={navigateToNotifications}
                style={styles.menuItem}>
                <View style={styles.itemIconContainer}>
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color={Colors.primary}
                  />
                  {hasUnreadNotifications ? <View style={styles.itemBadgeDot} /> : null}
                </View>
                <Text style={styles.itemLabel}>{t('nav.notifications')}</Text>
                {hasUnreadNotifications ? (
                  <View style={styles.itemCountBadge}>
                    <Text style={styles.itemCountText}>•</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                )}
              </TouchableOpacity>

              {/* Menu Item 2: Cart */}
              <TouchableOpacity
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`${t('nav.cart')}${cartCount > 0 ? `, ${cartCount} items` : ''}`}
                onPress={navigateToCart}
                style={styles.menuItem}>
                <View style={styles.itemIconContainer}>
                  <Ionicons
                    name="cart-outline"
                    size={20}
                    color={Colors.primary}
                  />
                </View>
                <Text style={styles.itemLabel}>{t('nav.cart')}</Text>
                {cartCount > 0 ? (
                  <View style={styles.itemCountBadge}>
                    <Text style={styles.itemCountText}>
                      {cartCount > 99 ? '99+' : cartCount}
                    </Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                )}
              </TouchableOpacity>

              {/* Menu Item 3: Language */}
              <TouchableOpacity
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`${t('profile.language')}, current: ${language === 'am' ? 'Amharic' : 'English'}`}
                onPress={() => setIsLangSubmenuOpen((prev) => !prev)}
                style={styles.menuItem}>
                <View style={styles.itemIconContainer}>
                  <Ionicons
                    name="globe-outline"
                    size={20}
                    color={Colors.primary}
                  />
                </View>
                <Text style={styles.itemLabel}>{t('profile.language')}</Text>
                <View style={styles.langValuePill}>
                  <Text style={styles.langValueText}>
                    {language === 'am' ? 'አማ' : 'EN'}
                  </Text>
                  <Ionicons
                    name={isLangSubmenuOpen ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={Colors.primary}
                  />
                </View>
              </TouchableOpacity>

              {/* Language Selection Submenu Options */}
              {isLangSubmenuOpen ? (
                <View style={styles.langSubmenu}>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => handleSelectLanguage('en')}
                    style={[
                      styles.langOption,
                      language === 'en' && styles.langOptionActive,
                    ]}>
                    <Text
                      style={[
                        styles.langOptionText,
                        language === 'en' && styles.langOptionTextActive,
                      ]}>
                      English (EN)
                    </Text>
                    {language === 'en' ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={Colors.primary}
                      />
                    ) : null}
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => handleSelectLanguage('am')}
                    style={[
                      styles.langOption,
                      language === 'am' && styles.langOptionActive,
                    ]}>
                    <Text
                      style={[
                        styles.langOptionText,
                        language === 'am' && styles.langOptionTextActive,
                      ]}>
                      አማርኛ (Amharic)
                    </Text>
                    {language === 'am' ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={Colors.primary}
                      />
                    ) : null}
                  </TouchableOpacity>
                </View>
              ) : null}
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: Spacing.xs + 2,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.xs + 2,
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
    paddingHorizontal: Spacing.sm + 4,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
  },
  menuTriggerBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  triggerBadgeDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: Colors.ardabRed,
    position: 'absolute',
    top: 6,
    right: 7,
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  // Modal / Dropdown Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  modalSafeArea: {
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 48 : 56,
    paddingRight: Spacing.md,
  },
  menuCard: {
    width: 270,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.lg,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  menuTitleIconBubble: {
    width: 26,
    height: 26,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    minHeight: 46,
  },
  itemIconContainer: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    position: 'relative',
  },
  itemBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.ardabRed,
    position: 'absolute',
    top: 4,
    right: 4,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  itemLabel: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text,
  },
  itemCountBadge: {
    backgroundColor: Colors.ardabRed,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCountText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  langValuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  langValueText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  langSubmenu: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
    padding: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
  },
  langOptionActive: {
    backgroundColor: Colors.primaryLight,
  },
  langOptionText: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.text,
  },
  langOptionTextActive: {
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
});
