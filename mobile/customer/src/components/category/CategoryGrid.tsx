import React from 'react';
import { View, StyleSheet, FlatList, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Category } from '@/types';
import { Spacing } from '@/theme';
import { CategoryCard } from './CategoryCard';

export interface CategoryGridProps {
  categories: Category[];
  horizontal?: boolean;
  onSelectCategory?: (category: Category) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  horizontal = false,
  onSelectCategory,
}) => {
  const router = useRouter();

  const handlePress = (category: Category) => {
    if (onSelectCategory) {
      onSelectCategory(category);
    } else {
      router.push(`/categories/${category.id}` as any);
    }
  };

  if (horizontal) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalContainer}>
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            variant="circle"
            onPress={() => handlePress(category)}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.gridContainer}>
      {categories.map((category) => (
        <View key={category.id} style={styles.gridItemWrapper}>
          <CategoryCard
            category={category}
            variant="card"
            onPress={() => handlePress(category)}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  horizontalContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  gridItemWrapper: {
    width: '47%',
  },
});
