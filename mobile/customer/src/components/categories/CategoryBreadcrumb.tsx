// ==============================================================================
// Ardab Market - Category Breadcrumb Navigation
// ==============================================================================
// Compact, non-overflowing breadcrumb path (e.g. Categories / Fashion / Men)
// Tapping an ancestor jumps directly back to that level.

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '@/theme';
import { CategoryNode } from '@/services/categoryService';
import { useApp } from '@/store';
import { t } from '@/localization';

interface CategoryBreadcrumbProps {
  ancestryPath: CategoryNode[];
  onSelectAncestor: (index: number) => void;
  onResetToRoot: () => void;
}

export const CategoryBreadcrumb: React.FC<CategoryBreadcrumbProps> = ({
  ancestryPath,
  onSelectAncestor,
  onResetToRoot,
}) => {
  const { language } = useApp();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Root Link */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onResetToRoot}
          style={styles.crumbBtn}>
          <Text style={[styles.crumbText, ancestryPath.length === 0 && styles.crumbTextActive]}>
            {t('categories.title')}
          </Text>
        </TouchableOpacity>

        {/* Ancestor Steps */}
        {ancestryPath.map((item, index) => {
          const isLast = index === ancestryPath.length - 1;
          const displayName = language === 'am' && item.nameAmharic ? item.nameAmharic : item.name;

          return (
            <React.Fragment key={item.id}>
              <View style={styles.separator}>
                <Ionicons name="chevron-forward" size={12} color={Colors.textMuted} />
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                disabled={isLast}
                onPress={() => onSelectAncestor(index)}
                style={styles.crumbBtn}>
                <Text
                  style={[
                    styles.crumbText,
                    isLast && styles.crumbTextActive,
                  ]}
                  numberOfLines={1}>
                  {displayName}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  crumbBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  crumbText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  crumbTextActive: {
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.bold,
  },
  separator: {
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
