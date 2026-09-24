import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { useApp } from '@/store';
import { AppHeader } from '@/components/common';
import { t } from '@/localization';

export default function LanguageScreen() {
  const router = useRouter();
  const { language, changeLanguage } = useApp();

  const options = [
    { key: 'en', title: 'English', subtitle: 'Default System Language' },
    { key: 'am', title: 'አማርኛ (Amharic)', subtitle: 'የኢትዮጵያ ፌዴራላዊ የሥራ ቋንቋ' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('profile.language')} showBack />
      <View style={styles.content}>
        <Text style={styles.desc}>
          {t('profile.languageHint')}
        </Text>

        {options.map((opt) => {
          const isSelected = language === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              activeOpacity={0.8}
              onPress={() => {
                changeLanguage(opt.key as any);
                router.back();
              }}
              style={[styles.langCard, isSelected && styles.langCardSelected]}>
              <View>
                <Text style={[styles.title, isSelected && styles.titleSelected]}>
                  {opt.title}
                </Text>
                <Text style={styles.subtitle}>{opt.subtitle}</Text>
              </View>

              <Ionicons
                name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={isSelected ? Colors.primary : Colors.textMuted}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.xl,
  },
  desc: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  langCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  langCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  titleSelected: {
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
