// ==============================================================================
// Ardab Market - Category Sidebar Drawer (Left Slide-in)
// ==============================================================================
// Compact, modern marketplace category sidebar triggered by the Ardab logo.
// Features smooth slide animation, backdrop touch dismiss, accordion hierarchy,
// skeleton loading, and localized retry error handling.

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { useCategories } from '@/hooks/useCategories';
import { useApp } from '@/store';
import { t } from '@/localization';
import { ArdabLogo } from '@/components/common/ArdabLogo';
import { CategoryDrawerItem } from './CategoryDrawerItem';
import { CategorySkeleton } from './CategorySkeleton';
import { CategoryNode } from '@/services/categoryService';

interface CategoryDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Max 75–85% width, clamped between 280px and 320px
const DRAWER_WIDTH = Math.min(Math.max(SCREEN_WIDTH * 0.78, 280), 320);

export const CategoryDrawer: React.FC<CategoryDrawerProps> = ({
  visible,
  onClose,
}) => {
  const router = useRouter();
  const { language } = useApp();
  const { categoryTree, isLoading, error, refreshCategories } = useCategories();

  // Animation values
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateX, overlayOpacity]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -DRAWER_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleSelectCategory = (category: CategoryNode) => {
    handleClose();
    const displayName = language === 'am' && category.nameAmharic ? category.nameAmharic : category.name;
    router.push(
      `/products?categoryId=${category.id}&title=${encodeURIComponent(displayName)}` as any
    );
  };

  const handleNavigateAllCategories = () => {
    handleClose();
    router.push('/(tabs)/categories' as any);
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent>
      <View style={styles.modalRoot}>
        {/* Subtle Semi-Transparent Dark Backdrop */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: overlayOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.45],
                }),
              },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Left Side Drawer Panel */}
        <Animated.View
          style={[
            styles.drawerPanel,
            {
              width: DRAWER_WIDTH,
              transform: [{ translateX }],
            },
          ]}>
          <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            {/* Drawer Header */}
            <View style={styles.header}>
              <View style={styles.headerBrand}>
                <ArdabLogo size="sm" />
                <View style={styles.headerTitleWrap}>
                  <Text style={styles.headerTitle}>{t('categories.title')}</Text>
                  <Text style={styles.headerSubtitle}>{t('common.appName')}</Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleClose}
                accessibilityLabel="Close category drawer"
                style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Content List */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}>
              {/* "All Categories" Top Action */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleNavigateAllCategories}
                style={styles.allCategoriesRow}>
                <View style={styles.allIconCircle}>
                  <Ionicons name="grid" size={16} color={Colors.primary} />
                </View>
                <Text style={styles.allCategoriesText}>{t('categories.title')}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Loading Skeletons */}
              {isLoading && categoryTree.length === 0 ? (
                <CategorySkeleton count={7} compact />
              ) : null}

              {/* Error State with Retry Button */}
              {error && categoryTree.length === 0 ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={32} color={Colors.error} />
                  <Text style={styles.errorTitle}>
                    {language === 'am' ? 'ምድቦችን መጫን አልተቻለም' : 'Unable to load categories'}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={refreshCategories}
                    style={styles.retryBtn}>
                    <Ionicons name="refresh" size={14} color="#FFFFFF" />
                    <Text style={styles.retryBtnText}>
                      {language === 'am' ? 'እንደገና ሞክር' : 'Retry'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Accordion Categories List */}
              {categoryTree.map((cat) => (
                <CategoryDrawerItem
                  key={cat.id}
                  category={cat}
                  level={0}
                  onSelectCategory={handleSelectCategory}
                  onNavigateAll={handleNavigateAllCategories}
                />
              ))}
            </ScrollView>

            {/* Bottom "View All Categories" Footer Action */}
            <View style={styles.footer}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleNavigateAllCategories}
                style={styles.viewAllBtn}>
                <Ionicons name="apps-outline" size={18} color="#FFFFFF" />
                <Text style={styles.viewAllBtnText}>
                  {language === 'am' ? 'ሁሉንም ምድቦች ይመልከቱ' : 'View All Categories'}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  drawerPanel: {
    height: '100%',
    backgroundColor: Colors.background,
    ...Shadows.lg,
    borderRightWidth: 1,
    borderRightColor: Colors.borderLight,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitleWrap: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textSecondary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  allCategoriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primaryLight + '20',
  },
  allIconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight + '50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  allCategoriesText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  errorContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.sm,
  },
  retryBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs + 2,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 3,
    borderRadius: Radius.md,
    ...Shadows.sm,
  },
  viewAllBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
});
