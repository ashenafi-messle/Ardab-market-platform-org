import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Typography, Spacing } from '../../theme';

export interface OrderFilterTabsProps {
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
}

export function OrderFilterTabs({ selectedStatus, onSelectStatus }: OrderFilterTabsProps) {
  const tabs = [
    { key: 'ALL', label: 'All Orders' },
    { key: 'ACCEPTED', label: 'Accepted' },
    { key: 'PROCESSING', label: 'Processing' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {tabs.map((tab) => {
        const isSelected = selectedStatus === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.7}
            onPress={() => onSelectStatus(tab.key)}
            style={[styles.tab, isSelected && styles.tabActive]}
          >
            <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs + 2,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  tabText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.textInverse,
    fontWeight: Typography.fontWeight.semibold,
  },
});

