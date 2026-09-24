import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Colors, Radius, Spacing } from '@/theme';

export const HomeSkeleton: React.FC<{
  type?: 'hero' | 'categories' | 'products';
}> = ({ type = 'products' }) => {
  if (type === 'hero') {
    return (
      <View style={styles.heroSkeleton}>
        <View style={styles.heroLineShort} />
        <View style={styles.heroLineLong} />
        <View style={styles.heroBtn} />
      </View>
    );
  }

  if (type === 'categories') {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.categoryItem}>
            <View style={styles.categoryCircle} />
            <View style={styles.categoryText} />
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.gridContainer}>
      {[1, 2, 3, 4].map((key) => (
        <View key={key} style={styles.productCard}>
          <View style={styles.productImg} />
          <View style={styles.productTitle} />
          <View style={styles.productPrice} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  heroSkeleton: {
    height: 180,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: Radius.xl,
    backgroundColor: '#EDF2EE',
    padding: Spacing.lg,
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  heroLineShort: {
    width: '40%',
    height: 14,
    borderRadius: Radius.xs,
    backgroundColor: '#D1EAE0',
  },
  heroLineLong: {
    width: '70%',
    height: 22,
    borderRadius: Radius.xs,
    backgroundColor: '#D1EAE0',
  },
  heroBtn: {
    width: 100,
    height: 32,
    borderRadius: Radius.pill,
    backgroundColor: '#D1EAE0',
    marginTop: Spacing.xs,
  },
  categoryScroll: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  categoryItem: {
    alignItems: 'center',
    width: 74,
  },
  categoryCircle: {
    width: 60,
    height: 60,
    borderRadius: Radius.pill,
    backgroundColor: '#EDF2EE',
  },
  categoryText: {
    width: 48,
    height: 10,
    borderRadius: Radius.xs,
    backgroundColor: '#EDF2EE',
    marginTop: 6,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    marginVertical: Spacing.sm,
  },
  productCard: {
    width: '47.5%',
    height: 230,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: '#EDF2EE',
  },
  productImg: {
    width: '100%',
    height: 140,
    borderRadius: Radius.md,
    backgroundColor: '#EDF2EE',
  },
  productTitle: {
    width: '80%',
    height: 14,
    borderRadius: Radius.xs,
    backgroundColor: '#EDF2EE',
    marginTop: 4,
  },
  productPrice: {
    width: '50%',
    height: 16,
    borderRadius: Radius.xs,
    backgroundColor: '#EDF2EE',
  },
});
