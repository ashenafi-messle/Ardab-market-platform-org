// ==============================================================================
// Ardab Market - Category Card Component
// ==============================================================================
// Clean, modern 64–80px card row for top-level and subcategory navigation.
// Features category image/icon, localized title, product count, and chevron indicator.

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { CategoryNode } from '@/services/categoryService';
import { useApp } from '@/store';

interface CategoryCardProps {
  category: CategoryNode;
  onPress: () => void;
  isLeaf?: boolean;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onPress,
  isLeaf = false,
}) => {
  const { language } = useApp();
  const displayName = language === 'am' && category.nameAmharic ? category.nameAmharic : category.name;
  const childCount = category.children?.length || 0;

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={`Open ${displayName}`}
      onPress={onPress}
      style={styles.card}>
      {/* Category Icon / Image */}
      <View style={styles.imageContainer}>
        {category.image ? (
          <Image source={{ uri: category.image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.iconFallback}>
            <Ionicons
              name={(category.icon as any) || 'folder-outline'}
              size={22}
              color={Colors.primary}
            />
          </View>
        )}
      </View>

      {/* Title & Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.subtitle}>
          {childCount > 0
            ? `${childCount} ${language === 'am' ? 'ንዑስ ምድቦች' : 'subcategories'}`
            : category.productCount > 0
            ? `${category.productCount} ${language === 'am' ? 'እቃዎች' : 'items'}`
            : language === 'am'
            ? 'ምርቶችን ያስሱ'
            : 'Browse products'}
        </Text>
      </View>

      {/* Right Chevron / Arrow */}
      <View style={styles.arrowContainer}>
        <Ionicons
          name={isLeaf ? 'arrow-forward' : 'chevron-forward'}
          size={18}
          color={Colors.textMuted}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  imageContainer: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.primaryLight + '25',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  iconFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  arrowContainer: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
