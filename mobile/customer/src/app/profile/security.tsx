import React, { useState } from 'react';
import { View, Text, ScrollView, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { AppHeader, AppInput, AppButton } from '@/components/common';
import { t } from '@/localization';

export default function SecurityScreen() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordToast, setPasswordToast] = useState(false);

  const handleUpdatePassword = () => {
    if (newPassword.length >= 6) {
      setPasswordToast(true);
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => setPasswordToast(false), 2500);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('profile.security')} showBack />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Verification Status */}
        <View style={styles.verifiedCard}>
          <View style={styles.verifiedIcon}>
            <Ionicons name="shield-checkmark" size={28} color={Colors.primary} />
          </View>
          <View style={styles.verifiedInfo}>
            <Text style={styles.verifiedTitle}>{t('home.verifiedMarketplace')}</Text>
            <Text style={styles.verifiedDesc}>
              {t('home.benefit1Desc')}
            </Text>
          </View>
        </View>

        {/* Security Toggles */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account Protection</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleTitle}>Two-Factor Authentication (2FA)</Text>
              <Text style={styles.toggleDesc}>
                Require an SMS code when signing in from an unknown device
              </Text>
            </View>
            <Switch
              value={twoFactorEnabled}
              onValueChange={setTwoFactorEnabled}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.background}
            />
          </View>

          <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleTitle}>Biometric Unlock</Text>
              <Text style={styles.toggleDesc}>
                Use fingerprint or Face ID to quickly verify purchases
              </Text>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={setBiometricsEnabled}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={Colors.background}
            />
          </View>
        </View>

        {/* Change Password Form */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('profile.changePassword')}</Text>

          <AppInput
            label={t('auth.password')}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            isPassword
          />

          <AppInput
            label={t('auth.createPassword')}
            value={newPassword}
            onChangeText={setNewPassword}
            isPassword
            helperText="Minimum 6 characters"
          />

          {passwordToast ? (
            <View style={styles.successToast}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.successToastText}>{t('success.passwordChanged')}</Text>
            </View>
          ) : null}

          <AppButton
            title={t('common.save')}
            variant="outline"
            size="md"
            onPress={handleUpdatePassword}
            disabled={newPassword.length < 6}
            style={{ marginTop: Spacing.xs }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.huge,
  },
  verifiedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  verifiedIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedInfo: {
    flex: 1,
  },
  verifiedTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  verifiedDesc: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  toggleTextCol: {
    flex: 1,
    marginRight: Spacing.md,
  },
  toggleTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  toggleDesc: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  successToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successLight,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
  },
  successToastText: {
    color: Colors.success,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
});
