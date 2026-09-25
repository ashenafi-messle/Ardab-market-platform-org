import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { Category } from '@/types';
import { SectionHeader } from '../common/SectionHeader';
import { AnimatedPressable } from '../common/AnimatedPressable';
import { useApp } from '@/store';
import { t } from '@/localization';
import { ImagePresets, DEFAULT_BLURHASH } from '@/utils/imageOptimizer';

export interface CategoryCarouselProps {
  categories: Category[];
  title?: string;
}

export const CategoryCarousel: React.FC<CategoryCarouselProps> = ({
  categories,
  title,
}) => {
  const router = useRouter();
  const { language } = useApp();

  return (
    <View style={styles.container}>
      <SectionHeader
        title={title || t('home.categories')}
        actionText={t('common.seeAll')}
        onAction={() => router.push('/(tabs)/categories' as any)}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {categories.map((category) => (
          <AnimatedPressable
            key={category.id}
            scaleTo={0.92}
            accessibilityLabel={category.name}
            onPress={() => router.push(`/categories/${category.id}` as any)}
            style={styles.itemWrapper}>
            <View style={styles.iconCircle}>
              {category.image ? (
                <ExpoImage
                  source={{ uri: ImagePresets.category(category.image) }}
                  style={styles.categoryImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  placeholder={{ blurhash: DEFAULT_BLURHASH }}
                  transition={150}
                />
              ) : (
                <Ionicons
                  name={(category.icon as any) || 'grid-outline'}
                  size={24}
                  color={Colors.primaryDark}
                />
              )}
            </View>
            <Text style={styles.label} numberOfLines={2}>
              {language === 'am' && category.nameAmharic ? category.nameAmharic : category.name}
            </Text>
          </AnimatedPressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  itemWrapper: {
    alignItems: 'center',
    width: 74,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: Radius.pill,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#EDF2EE',
    ...Shadows.sm,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  label: {
    fontSize: 11,
    color: Colors.text,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: 14,
  },
});
