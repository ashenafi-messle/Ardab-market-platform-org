import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Radius, Spacing } from '@/theme';
import { AppText } from './AppText';

export interface LoadingStateProps {
  message?: string;
  type?: 'spinner' | 'skeleton-grid' | 'skeleton-list';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  type = 'spinner',
}) => {
  if (type === 'skeleton-grid') {
    return (
      <View style={styles.gridContainer}>
        {[1, 2, 3, 4].map((key) => (
          <View key={key} style={styles.skeletonCard}>
            <View style={styles.skeletonImage} />
            <View style={styles.skeletonLineShort} />
            <View style={styles.skeletonLineMedium} />
            <View style={styles.skeletonLineLong} />
          </View>
        ))}
      </View>
    );
  }

  if (type === 'skeleton-list') {
    return (
      <View style={styles.listContainer}>
        {[1, 2, 3].map((key) => (
          <View key={key} style={styles.skeletonListItem}>
            <View style={styles.skeletonThumb} />
            <View style={styles.skeletonListContent}>
              <View style={styles.skeletonLineMedium} />
              <View style={styles.skeletonLineShort} />
              <View style={styles.skeletonLineLong} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={Colors.primary} />
      {message ? (
        <AppText variant="caption" color={Colors.textSecondary} style={styles.msgText}>
          {message}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    padding: Spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgText: {
    marginTop: Spacing.md,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  skeletonCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  skeletonImage: {
    height: 140,
    backgroundColor: Colors.border,
    borderRadius: Radius.md,
    opacity: 0.6,
  },
  skeletonLineShort: {
    height: 12,
    width: '50%',
    backgroundColor: Colors.border,
    borderRadius: Radius.xs,
    marginTop: Spacing.xs,
    opacity: 0.6,
  },
  skeletonLineMedium: {
    height: 14,
    width: '80%',
    backgroundColor: Colors.border,
    borderRadius: Radius.xs,
    opacity: 0.6,
  },
  skeletonLineLong: {
    height: 16,
    width: '60%',
    backgroundColor: Colors.border,
    borderRadius: Radius.xs,
    opacity: 0.6,
  },
  listContainer: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  skeletonListItem: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    gap: Spacing.md,
    alignItems: 'center',
  },
  skeletonThumb: {
    width: 70,
    height: 70,
    backgroundColor: Colors.border,
    borderRadius: Radius.md,
    opacity: 0.6,
  },
  skeletonListContent: {
    flex: 1,
    gap: Spacing.xs,
  },
});
