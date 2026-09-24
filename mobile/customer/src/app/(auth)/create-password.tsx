import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { AppHeader, AppInput, AppButton } from '@/components/common';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/store';
import { t } from '@/localization';

export default function CreatePasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { createPasswordAndAccount } = useAuth();
  const { language } = useApp();

  const method = (params.method as string) || 'email';
  const email = (params.email as string) || '';
  const phone = (params.phone as string) || '';
  const city = (params.city as string) || 'Gondar';
  const verificationToken = (params.verificationToken as string) || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password Strength Evaluation
  const getPasswordStrength = (pwd: string): { label: string; score: number; color: string } => {
    if (!pwd) return { label: '', score: 0, color: Colors.border };
    if (pwd.length < 6) return { label: t('auth.weak'), score: 1, color: Colors.error };
    const hasLetters = /[a-zA-Z]/.test(pwd);
    const hasNumbers = /[0-9]/.test(pwd);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);

    if (pwd.length >= 8 && hasLetters && hasNumbers && hasSpecial) {
      return { label: t('auth.strong'), score: 3, color: Colors.success };
    }
    if (pwd.length >= 6 && hasLetters && hasNumbers) {
      return { label: t('auth.medium'), score: 2, color: Colors.warning };
    }
    return { label: t('auth.weak'), score: 1, color: Colors.error };
  };

  const strength = getPasswordStrength(password);

  const handleCreateAccount = async () => {
    setError('');

    if (password.length < 6) {
      setError(t('validation.passwordLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('validation.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      await createPasswordAndAccount({
        email: email || undefined,
        phone: phone || undefined,
        city,
        password,
        verificationToken: verificationToken || undefined,
      });

      setLoading(false);

      // Successfully created & authenticated -> Open Home directly!
      router.replace('/(tabs)' as any);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || t('errors.general'));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={t('auth.createPasswordTitle')}
        showBack
        onBackPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(auth)/register' as any);
          }
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Header Intro with Brand Logo */}
        <View style={styles.introSection}>
          <View style={styles.logoWrapper}>
            <Image
              source={{
                uri: 'https://res.cloudinary.com/dr9umkixr/image/upload/v1789292515/5841569209974984677_ktnepe.jpg',
              }}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.title}>{t('auth.createPasswordTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.createPasswordSubtitle')}</Text>
        </View>

        {/* Identity Context */}
        <View style={styles.contextPill}>
          <Ionicons
            name={method === 'email' ? 'mail-outline' : 'paper-plane-outline'}
            size={16}
            color={Colors.primary}
          />
          <Text style={styles.contextText}>{email || phone}</Text>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>

        {/* Password Form */}
        <View style={styles.formCard}>
          {/* New Password */}
          <AppInput
            label={t('auth.password')}
            placeholder="Min. 6 characters"
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              if (error) setError('');
            }}
            secureTextEntry={!showPassword}
            leftIcon={<Ionicons name="key-outline" size={18} color={Colors.primary} />}
            rightIcon={
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            }
          />

          {/* Password Strength Meter */}
          {password.length > 0 ? (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBars}>
                <View
                  style={[
                    styles.strengthBar,
                    strength.score >= 1 && { backgroundColor: strength.color },
                  ]}
                />
                <View
                  style={[
                    styles.strengthBar,
                    strength.score >= 2 && { backgroundColor: strength.color },
                  ]}
                />
                <View
                  style={[
                    styles.strengthBar,
                    strength.score >= 3 && { backgroundColor: strength.color },
                  ]}
                />
              </View>
              <Text style={[styles.strengthLabel, { color: strength.color }]}>
                {t('auth.passwordStrength')}: {strength.label}
              </Text>
            </View>
          ) : null}

          {/* Confirm Password */}
          <AppInput
            label={t('auth.confirmPassword')}
            placeholder="Re-enter password"
            value={confirmPassword}
            onChangeText={(val) => {
              setConfirmPassword(val);
              if (error) setError('');
            }}
            secureTextEntry={!showConfirmPassword}
            leftIcon={<Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />}
            rightIcon={
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            }
          />

          {/* Error Message */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Action Button */}
          <View style={styles.actionContainer}>
            <AppButton
              title={t('auth.signUp')}
              loading={loading}
              onPress={handleCreateAccount}
              disabled={loading || password.length < 6 || confirmPassword.length < 6}
              variant="primary"
              size="lg"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  introSection: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  logoWrapper: {
    width: 60,
    height: 60,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  contextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    gap: Spacing.xs + 2,
  },
  contextText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.successLight + '30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.success,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  strengthContainer: {
    marginBottom: Spacing.md,
    marginTop: -Spacing.xs,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  strengthLabel: {
    fontSize: Typography.fontSize.tiny,
    fontWeight: Typography.fontWeight.medium,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight + '25',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
  },
  actionContainer: {
    marginTop: Spacing.xs,
  },
});
