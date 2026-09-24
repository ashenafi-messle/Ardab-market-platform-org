import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/theme';
import { useApp } from '@/store';
import { AppHeader, AppInput, AppButton } from '@/components/common';
import { t } from '@/localization';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser, language } = useApp();

  const [fullName, setFullName] = useState(user?.fullName || 'Yonas Tadesse');
  const [email, setEmail] = useState(user?.email || 'yonas.tadesse@example.com');
  const [phone, setPhone] = useState(user?.phone || '+251 91 123 4567');
  const [city, setCity] = useState(user?.city || 'Gondar');
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = () => {
    updateUser({ fullName, email, phone, city });
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      router.back();
    }, 700);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('profile.editProfile')} showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{fullName.slice(0, 2).toUpperCase()}</Text>
          </View>
        </View>

        <AppInput
          label={t('profile.fullName')}
          value={fullName}
          onChangeText={setFullName}
          leftIcon={<Ionicons name="person-outline" size={18} color={Colors.primary} />}
        />

        <AppInput
          label={t('profile.email')}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          leftIcon={<Ionicons name="mail-outline" size={18} color={Colors.primary} />}
        />

        <AppInput
          label={t('profile.phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          leftIcon={<Ionicons name="call-outline" size={18} color={Colors.primary} />}
        />

        <AppInput
          label={t('profile.city')}
          value={city}
          onChangeText={setCity}
          leftIcon={<Ionicons name="location-outline" size={18} color={Colors.primary} />}
        />

        {savedToast ? (
          <View style={styles.savedBanner}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            <Text style={styles.savedText}>{t('success.profileUpdated')}</Text>
          </View>
        ) : null}

        <AppButton
          title={t('common.save')}
          variant="primary"
          size="lg"
          onPress={handleSave}
          style={{ marginTop: Spacing.md }}
        />
      </ScrollView>
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginVertical: Spacing.sm,
  },
  savedText: {
    color: Colors.success,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
});
