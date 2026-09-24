import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { t } from '@/localization';

export const MarketplaceBenefits: React.FC = () => {
  const benefits = [
    {
      id: 'b1',
      icon: 'shield-checkmark',
      title: t('home.benefit1Title'),
      desc: t('home.benefit1Desc'),
    },
    {
      id: 'b2',
      icon: 'bicycle',
      title: t('home.benefit2Title'),
      desc: t('home.benefit2Desc'),
    },
    {
      id: 'b3',
      icon: 'card',
      title: t('home.benefit3Title'),
      desc: t('home.benefit3Desc'),
    },
    {
      id: 'b4',
      icon: 'headset',
      title: t('profile.support'),
      desc: t('support.hours'),
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {benefits.map((b) => (
          <View key={b.id} style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name={b.icon as any} size={18} color={Colors.primary} />
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {b.title}
            </Text>
            <Text style={styles.desc} numberOfLines={2}>
              {b.desc}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  card: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#EDF2EE',
    ...Shadows.sm,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    backgroundColor: '#E6F7E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs + 2,
  },
  title: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  desc: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },
});
