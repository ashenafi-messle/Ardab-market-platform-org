// ==============================================================================
// Ardab Market - Category Skeleton Loader
// ==============================================================================
// Compact, lightweight skeleton placeholder rows while categories are loading.

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors, Radius, Spacing } from '@/theme';

interface CategorySkeletonProps {
  count?: number;
  compact?: boolean;
}

export const CategorySkeleton: React.FC<CategorySkeletonProps> = ({
  count = 6,
  compact = false,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={[styles.row, compact && styles.compactRow]}>
          <Animated.View style={[styles.iconBox, { opacity: pulseAnim }]} />
          <View style={styles.textBox}>
            <Animated.View
              style={[
                styles.nameBar,
                { width: `${60 + (index % 3) * 15}%`, opacity: pulseAnim },
              ]}
            />
            {!compact ? (
              <Animated.View style={[styles.subBar, { opacity: pulseAnim }]} />
            ) : null}
          </View>
          <Animated.View style={[styles.chevronBox, { opacity: pulseAnim }]} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight + '60',
  },
  compactRow: {
    paddingVertical: Spacing.sm + 2,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: '#E2E8F0',
    marginRight: Spacing.sm,
  },
  textBox: {
    flex: 1,
    justifyContent: 'center',
  },
  nameBar: {
    height: 14,
    borderRadius: Radius.xs,
    backgroundColor: '#E2E8F0',
    marginBottom: 4,
  },
  subBar: {
    height: 10,
    width: '40%',
    borderRadius: Radius.xs,
    backgroundColor: '#EDF2F7',
  },
  chevronBox: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E2E8F0',
  },
});
