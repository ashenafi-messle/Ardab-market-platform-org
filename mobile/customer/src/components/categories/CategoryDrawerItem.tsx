// ==============================================================================
// Ardab Market - Category Drawer Item (Accordion Level)
// ==============================================================================
// Renders an expandable hierarchical category item for the thin sidebar drawer.
// Respects Category -> Subcategory -> Sub-subcategory hierarchy without overwhelming.

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/theme';
import { CategoryNode } from '@/services/categoryService';
import { useApp } from '@/store';

interface CategoryDrawerItemProps {
  category: CategoryNode;
  level?: number;
  onSelectCategory: (category: CategoryNode) => void;
  onNavigateAll?: () => void;
}

export const CategoryDrawerItem: React.FC<CategoryDrawerItemProps> = ({
  category,
  level = 0,
  onSelectCategory,
  onNavigateAll,
}) => {
  const { language } = useApp();
  const [expanded, setExpanded] = useState<boolean>(false);

  const hasChildren = category.children && category.children.length > 0;
  const displayName = language === 'am' && category.nameAmharic ? category.nameAmharic : category.name;

  const handlePress = () => {
    if (hasChildren) {
      setExpanded(!expanded);
    } else {
      // Leaf category -> select for product listing
      onSelectCategory(category);
    }
  };

  const getIndentStyle = () => {
    if (level === 1) return styles.level1;
    if (level === 2) return styles.level2;
    return styles.level0;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${displayName}, ${hasChildren ? (expanded ? 'collapse' : 'expand') : 'view products'}`}
        onPress={handlePress}
        style={[styles.row, getIndentStyle(), expanded && styles.rowActive]}>
        {/* Category Icon / Bullet */}
        <View style={[styles.iconWrapper, level > 0 && styles.subIconWrapper]}>
          {level === 0 ? (
            category.image ? (
              <Image source={{ uri: category.image }} style={styles.catImage} resizeMode="cover" />
            ) : (
              <Ionicons
                name={(category.icon as any) || 'folder-outline'}
                size={18}
                color={expanded ? Colors.primaryDark : Colors.primary}
              />
            )
          ) : (
            <View style={[styles.bulletDot, level === 2 && styles.subBulletDot]} />
          )}
        </View>

        {/* Category Title & Product Count */}
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.nameText,
              level === 0 && styles.nameTextRoot,
              expanded && styles.nameTextActive,
            ]}
            numberOfLines={1}>
            {displayName}
          </Text>
          {category.productCount > 0 && level === 0 ? (
            <Text style={styles.countText}>{category.productCount}</Text>
          ) : null}
        </View>

        {/* Expansion / Navigation Chevron */}
        <View style={styles.chevronWrapper}>
          {hasChildren ? (
            <Ionicons
              name={expanded ? 'chevron-down' : 'chevron-forward'}
              size={16}
              color={expanded ? Colors.primary : Colors.textMuted}
            />
          ) : (
            <Ionicons name="arrow-forward" size={14} color={Colors.textMuted} />
          )}
        </View>
      </TouchableOpacity>

      {/* Accordion Children Container (Immediate children only) */}
      {hasChildren && expanded ? (
        <View style={styles.childrenContainer}>
          {/* Quick link to view all in this category */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onSelectCategory(category)}
            style={[styles.row, styles.allInParentRow, level === 0 ? styles.level1 : styles.level2]}>
            <View style={styles.allIconWrapper}>
              <Ionicons name="grid-outline" size={12} color={Colors.primary} />
            </View>
            <Text style={styles.allInParentText}>
              {language === 'am' ? `ሁሉንም በ${displayName} ይመልከቱ` : `View all in ${displayName}`}
            </Text>
            <Ionicons name="arrow-forward" size={12} color={Colors.primary} />
          </TouchableOpacity>

          {/* Child Category Items */}
          {category.children.map((child) => (
            <CategoryDrawerItem
              key={child.id}
              category={child}
              level={level + 1}
              onSelectCategory={onSelectCategory}
              onNavigateAll={onNavigateAll}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight + '60',
  },
  rowActive: {
    backgroundColor: Colors.primaryLight + '15',
  },
  level0: {
    paddingLeft: Spacing.md,
  },
  level1: {
    paddingLeft: Spacing.xl + 4,
    backgroundColor: '#FAFDFB',
  },
  level2: {
    paddingLeft: Spacing.xxl + 12,
    backgroundColor: '#F5FAF7',
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    overflow: 'hidden',
  },
  subIconWrapper: {
    width: 16,
    height: 16,
    backgroundColor: 'transparent',
    marginRight: Spacing.xs,
  },
  catImage: {
    width: '100%',
    height: '100%',
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  subBulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
  },
  textContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: Spacing.xs,
  },
  nameText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    fontWeight: Typography.fontWeight.medium,
    flex: 1,
  },
  nameTextRoot: {
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    fontSize: Typography.fontSize.sm + 0.5,
  },
  nameTextActive: {
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.bold,
  },
  countText: {
    fontSize: 11,
    color: Colors.textMuted,
    backgroundColor: Colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginLeft: 6,
  },
  chevronWrapper: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childrenContainer: {
    backgroundColor: '#FCFDFD',
  },
  allInParentRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight + '40',
  },
  allIconWrapper: {
    marginRight: 6,
  },
  allInParentText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
    flex: 1,
  },
});
