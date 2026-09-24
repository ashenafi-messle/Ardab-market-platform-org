import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { Category } from '@/types';
import { useApp } from '@/store';

export interface CategoryCardProps {
  category: Category;
  onPress: () => void;
  variant?: 'circle' | 'card' | 'banner';
  style?: ViewStyle;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onPress,
  variant = 'circle',
  style,
}) => {
  const { language } = useApp();
  const displayName = language === 'am' && category.nameAmharic ? category.nameAmharic : category.name;

  if (variant === 'circle') {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[styles.circleItem, style]}>
        <View style={styles.circleImageWrapper}>
          {category.image ? (
            <Image source={{ uri: category.image }} style={styles.circleImage} resizeMode="cover" />
          ) : (
            <Ionicons name={category.icon as any || 'grid-outline'} size={28} color={Colors.primary} />
          )}
        </View>
        <Text style={styles.circleLabel} numberOfLines={2}>
          {displayName}
        </Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'banner') {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        style={[styles.bannerCard, style]}>
        <Image
          source={{ uri: category.bannerImage || category.image }}
          style={styles.bannerImage}
          resizeMode="cover"
        />
        <View style={styles.bannerOverlay}>
          <Text style={styles.bannerTitle}>{displayName}</Text>
          <Text style={styles.bannerCount}>{category.productCount}+ items available</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.cardItem, style]}>
      <Image source={{ uri: category.image }} style={styles.cardImage} resizeMode="cover" />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={styles.cardCount}>
          {category.productCount} items
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Circle shortcut variant (for home screen)
  circleItem: {
    alignItems: 'center',
    width: 76,
    marginRight: Spacing.sm,
  },
  circleImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  circleImage: {
    width: '100%',
    height: '100%',
  },
  circleLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text,
    textAlign: 'center',
    marginTop: Spacing.xs,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: 14,
  },

  // Card variant (for category listing)
  cardItem: {
    flex: 1,
    minWidth: 150,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
    marginBottom: Spacing.md,
  },
  cardImage: {
    width: '100%',
    height: 100,
    backgroundColor: Colors.surface,
  },
  cardInfo: {
    padding: Spacing.sm + 2,
  },
  cardTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  cardCount: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Banner variant
  bannerCard: {
    width: '100%',
    height: 120,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(14, 64, 50, 0.65)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  bannerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.heavy,
    color: Colors.textInverse,
  },
  bannerCount: {
    fontSize: Typography.fontSize.xs,
    color: Colors.accentLight,
    marginTop: 4,
  },
});
