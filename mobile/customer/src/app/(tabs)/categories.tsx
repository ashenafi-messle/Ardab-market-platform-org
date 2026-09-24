// ==============================================================================
// Ardab Market - Categories Screen (Hierarchical Drill-Down Browser)
// ==============================================================================
// Redesigned to show ONLY top-level categories initially, providing a fast,
// modern drill-down navigation (Category -> Subcategory -> Sub-subcategory)
// with breadcrumbs, natural back navigation, instant memory caching, and search.

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  BackHandler,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { useCategories } from '@/hooks/useCategories';
import { useApp } from '@/store';
import { t } from '@/localization';
import { CategoryNode } from '@/services/categoryService';
import { CategoryCard, CategoryBreadcrumb, CategorySkeleton } from '@/components/categories';

export default function CategoriesScreen() {
  const router = useRouter();
  const { language, cartCount } = useApp();
  const { categoryTree, isLoading, error, refreshCategories, searchCategories } = useCategories();

  // Navigation Stack for Hierarchical Drill-Down:
  // [] = Root Categories
  // [Fashion] = Subcategories of Fashion
  // [Fashion, Men] = Sub-subcategories of Men
  const [navigationStack, setNavigationStack] = useState<CategoryNode[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Handle hardware Android back button to navigate backwards in category hierarchy
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (searchQuery.trim().length > 0) {
          setSearchQuery('');
          return true;
        }
        if (navigationStack.length > 0) {
          setNavigationStack((prev) => prev.slice(0, prev.length - 1));
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [navigationStack, searchQuery])
  );

  // Current active parent node in the hierarchy
  const currentCategory = navigationStack.length > 0 ? navigationStack[navigationStack.length - 1] : null;

  // Active items to display:
  // Root level = top-level categories
  // Drill-down level = immediate children of currentCategory
  const currentItems = useMemo(() => {
    if (!currentCategory) {
      return categoryTree;
    }
    return currentCategory.children || [];
  }, [currentCategory, categoryTree]);

  // Search Results across all hierarchy levels
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchCategories(searchQuery);
  }, [searchQuery, searchCategories]);

  // Navigation actions
  const handleSelectCategory = (category: CategoryNode) => {
    if (category.children && category.children.length > 0) {
      // Has children -> Drill down to show ONLY its immediate children
      setNavigationStack((prev) => [...prev, category]);
      setSearchQuery('');
    } else {
      // Leaf category -> Navigate to products listing
      const displayName = language === 'am' && category.nameAmharic ? category.nameAmharic : category.name;
      router.push(
        `/products?categoryId=${category.id}&title=${encodeURIComponent(displayName)}` as any
      );
    }
  };

  const handleBack = () => {
    if (searchQuery.trim().length > 0) {
      setSearchQuery('');
      return;
    }
    if (navigationStack.length > 0) {
      setNavigationStack((prev) => prev.slice(0, prev.length - 1));
    } else {
      router.replace('/(tabs)' as any);
    }
  };

  const handleSelectAncestor = (index: number) => {
    // Jump back to chosen ancestor level in breadcrumb
    setNavigationStack((prev) => prev.slice(0, index + 1));
    setSearchQuery('');
  };

  const handleResetToRoot = () => {
    setNavigationStack([]);
    setSearchQuery('');
  };

  const handleViewAllInCurrent = () => {
    if (!currentCategory) return;
    const displayName = language === 'am' && currentCategory.nameAmharic ? currentCategory.nameAmharic : currentCategory.name;
    router.push(
      `/products?categoryId=${currentCategory.id}&title=${encodeURIComponent(displayName)}` as any
    );
  };

  // Header Title
  const headerTitle = currentCategory
    ? language === 'am' && currentCategory.nameAmharic
      ? currentCategory.nameAmharic
      : currentCategory.name
    : t('categories.title');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top App Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {navigationStack.length > 0 || searchQuery.trim().length > 0 ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleBack}
              accessibilityLabel="Back"
              style={styles.backButton}>
              <Ionicons name="arrow-back" size={20} color={Colors.text} />
            </TouchableOpacity>
          ) : null}

          <View style={styles.titleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {headerTitle}
            </Text>
            {currentCategory ? (
              <Text style={styles.headerSubtitle}>
                {currentCategory.children.length} {language === 'am' ? 'ንዑስ ምድቦች' : 'subcategories'}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Right Header Actions: Cart */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/cart' as any)}
          accessibilityLabel={t('nav.cart')}
          style={styles.cartBtn}>
          <Ionicons name="cart-outline" size={22} color={Colors.text} />
          {cartCount > 0 ? (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>
                {cartCount > 99 ? '99+' : cartCount}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.primary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('categories.searchPlaceholder')}
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Subtle Breadcrumbs (Visible when inside a category branch and not searching) */}
      {navigationStack.length > 0 && !searchQuery.trim() ? (
        <CategoryBreadcrumb
          ancestryPath={navigationStack}
          onSelectAncestor={handleSelectAncestor}
          onResetToRoot={handleResetToRoot}
        />
      ) : null}

      {/* Main Category Content Area */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Loading Skeletons */}
        {isLoading && categoryTree.length === 0 ? (
          <CategorySkeleton count={6} />
        ) : null}

        {/* Error State */}
        {error && categoryTree.length === 0 ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={36} color={Colors.error} />
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

        {/* SEARCH MODE RESULTS */}
        {searchQuery.trim().length > 0 ? (
          <View style={styles.searchSection}>
            <Text style={styles.sectionHeading}>
              {language === 'am'
                ? `የፍለጋ ውጤቶች (${searchResults.length})`
                : `Search Results (${searchResults.length})`}
            </Text>

            {searchResults.length === 0 ? (
              <View style={styles.emptySearch}>
                <Ionicons name="search-outline" size={40} color={Colors.border} />
                <Text style={styles.emptyTitle}>{t('categories.noResults')}</Text>
                <Text style={styles.emptySubtitle}>
                  {language === 'am'
                    ? 'እባክዎ የተለየ ቃል ወይም ፊደል በመጠቀም ይሞክሩ'
                    : 'Try checking your spelling or use general keywords'}
                </Text>
              </View>
            ) : (
              searchResults.map(({ category, path }) => {
                const displayName = language === 'am' && category.nameAmharic ? category.nameAmharic : category.name;
                const pathString = path
                  .map((p) => (language === 'am' && p.nameAmharic ? p.nameAmharic : p.name))
                  .join(' › ');
                const hasChildren = category.children && category.children.length > 0;

                return (
                  <TouchableOpacity
                    key={category.id}
                    activeOpacity={0.78}
                    onPress={() => handleSelectCategory(category)}
                    style={styles.searchResultCard}>
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName}>{displayName}</Text>
                      <Text style={styles.searchResultPath} numberOfLines={1}>
                        {pathString}
                      </Text>
                    </View>
                    <Ionicons
                      name={hasChildren ? 'chevron-forward' : 'arrow-forward'}
                      size={18}
                      color={Colors.primary}
                    />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ) : (
          /* STANDARD HIERARCHICAL DRILL-DOWN MODE */
          <View style={styles.categoriesList}>
            {/* Explanatory subtitle for current level */}
            <View style={styles.listHeaderRow}>
              <Text style={styles.listHeaderTitle}>
                {currentCategory
                  ? language === 'am'
                    ? `${headerTitle} - ንዑስ ክፍሎች`
                    : `${headerTitle} - Subcategories`
                  : t('categories.subtitle')}
              </Text>
            </View>

            {/* List of clean category cards */}
            {currentItems.map((cat) => {
              const isLeaf = !cat.children || cat.children.length === 0;
              return (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  isLeaf={isLeaf}
                  onPress={() => handleSelectCategory(cat)}
                />
              );
            })}

            {/* If inside a category, button to view all products in the entire category */}
            {currentCategory ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleViewAllInCurrent}
                style={styles.viewAllBanner}>
                <Ionicons name="grid-outline" size={18} color="#FFFFFF" />
                <Text style={styles.viewAllBannerText}>
                  {t('categories.viewAllIn', { category: headerTitle })}
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </ScrollView>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  titleWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  cartBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    position: 'relative',
    ...Shadows.sm,
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: Colors.ardabRed,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textInverse,
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    height: 42,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.xs + 2,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    paddingVertical: 0,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  listHeaderRow: {
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  listHeaderTitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  categoriesList: {
    width: '100%',
  },
  viewAllBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs + 2,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  viewAllBannerText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  searchSection: {
    width: '100%',
  },
  sectionHeading: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  searchResultInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  searchResultName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  searchResultPath: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.primary,
    marginTop: 2,
  },
  emptySearch: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
    maxWidth: 240,
  },
  errorCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: Spacing.lg,
  },
  errorTitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  retryBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: '#FFFFFF',
  },
});
