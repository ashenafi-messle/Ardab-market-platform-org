import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { useAuth, maskIdentity } from '@/context/AuthContext';
import { useApp } from '@/store';
import { t } from '@/localization';
import { AppHeader, AppInput, AppButton } from '@/components/common';

export default function LoginScreen() {
  const router = useRouter();
  const { login, savedIdentity } = useAuth();
  const { language } = useApp();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usingSavedIdentity, setUsingSavedIdentity] = useState(false);

  // Initialize with saved identity if present on device
  useEffect(() => {
    if (savedIdentity) {
      setIdentifier(savedIdentity);
      setUsingSavedIdentity(true);
    }
  }, [savedIdentity]);

  const handleUseSavedAccount = () => {
    if (savedIdentity) {
      setIdentifier(savedIdentity);
      setUsingSavedIdentity(true);
      setPassword('');
      setError('');
    }
  };

  const handleUseAnotherAccount = () => {
    setUsingSavedIdentity(false);
    setIdentifier('');
    setPassword('');
    setError('');
  };

  const handleLogin = async () => {
    const cleanId = identifier.trim();
    if (!cleanId) {
      setError(t('validation.required'));
      return;
    }
    if (!password) {
      setError(t('validation.required'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(cleanId, password);
      setLoading(false);
      router.replace('/(tabs)' as any);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || t('errors.invalidCredentials'));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={t('auth.signIn')}
        showBack
        onBackPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)' as any);
          }
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Brand Logo & Intro */}
        <View style={styles.brandRow}>
          <View style={styles.logoWrapper}>
            <Image
              source={{
                uri: 'https://res.cloudinary.com/dr9umkixr/image/upload/v1789292515/5841569209974984677_ktnepe.jpg',
              }}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.title}>{t('auth.welcomeBack')}</Text>
          <Text style={styles.subtitle}>{t('auth.loginDesc')}</Text>
        </View>

        {/* RETURNING USER UX: Masked Identity Banner */}
        {savedIdentity && usingSavedIdentity ? (
          <View style={styles.returningCard}>
            <View style={styles.returningHeader}>
              <View style={styles.avatarPill}>
                <Ionicons name="person" size={20} color={Colors.primary} />
              </View>
              <View style={styles.returningMeta}>
                <Text style={styles.returningGreeting}>{t('auth.welcomeBackUser')}</Text>
                <Text style={styles.returningId}>{maskIdentity(savedIdentity)}</Text>
              </View>
            </View>

            {/* Password input for returning user */}
            <View style={styles.returningInputWrapper}>
              <AppInput
                label={t('auth.password')}
                placeholder="Enter your password"
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (error) setError('');
                }}
                secureTextEntry={!showPassword}
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />}
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
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(auth)/forgot-password' as any)}
              style={styles.forgotPasswordWrapper}>
              <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>

            {/* Error Banner */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Continue Button */}
            <View style={styles.actionContainer}>
              <AppButton
                title={t('auth.continue')}
                loading={loading}
                onPress={handleLogin}
                disabled={loading || !password}
                variant="primary"
                size="lg"
              />
            </View>

            {/* Use Another Account Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleUseAnotherAccount}
              style={styles.useAnotherAccountBtn}>
              <Ionicons name="person-add-outline" size={16} color={Colors.primary} />
              <Text style={styles.useAnotherAccountText}>{t('auth.useAnotherAccount')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* STANDARD / NEW USER FORM */
          <View style={styles.formCard}>
            {/* If there's a saved identity, option to switch back */}
            {savedIdentity ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleUseSavedAccount}
                style={styles.switchBackBtn}>
                <Ionicons name="arrow-back-outline" size={14} color={Colors.primary} />
                <Text style={styles.switchBackText}>
                  {t('auth.useSavedAccount')} ({maskIdentity(savedIdentity)})
                </Text>
              </TouchableOpacity>
            ) : null}

            {/* Email or Phone Input */}
            <AppInput
              label={t('auth.emailOrPhone')}
              placeholder="e.g. user@example.com or +251 91..."
              value={identifier}
              onChangeText={(val) => {
                setIdentifier(val);
                if (error) setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<Ionicons name="person-outline" size={18} color={Colors.primary} />}
            />

            {/* Password Input with Show/Hide Toggle */}
            <AppInput
              label={t('auth.password')}
              placeholder="Enter your password"
              value={password}
              onChangeText={(val) => {
                setPassword(val);
                if (error) setError('');
              }}
              secureTextEntry={!showPassword}
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />}
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

            {/* Forgot Password Link */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(auth)/forgot-password' as any)}
              style={styles.forgotPasswordWrapper}>
              <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>

            {/* Error Banner */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Sign In Button */}
            <View style={styles.actionContainer}>
              <AppButton
                title={t('auth.signIn')}
                loading={loading}
                onPress={handleLogin}
                disabled={loading || !identifier.trim() || !password}
                variant="primary"
                size="lg"
              />
            </View>
          </View>
        )}

        {/* Footer Link to Registration */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.dontHaveAccount')}</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(auth)/register' as any)}>
            <Text style={styles.footerLink}>{t('auth.signUp')}</Text>
          </TouchableOpacity>
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
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  brandRow: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
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
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 300,
  },
  returningCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  returningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  avatarPill: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  returningMeta: {
    flex: 1,
  },
  returningGreeting: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  returningId: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: 2,
  },
  returningInputWrapper: {
    marginBottom: Spacing.xs,
  },
  useAnotherAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  useAnotherAccountText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  switchBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  switchBackText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  forgotPasswordWrapper: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  forgotPasswordText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  errorText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
    flex: 1,
  },
  actionContainer: {
    marginTop: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  footerText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
});
