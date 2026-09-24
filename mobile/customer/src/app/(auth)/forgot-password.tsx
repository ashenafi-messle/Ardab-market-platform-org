import React, { useState } from 'react';
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
import { AppHeader, AppInput, AppButton } from '@/components/common';
import { authApi } from '@/services/authApi';
import { useAuth } from '@/context/AuthContext';
import { t } from '@/localization';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [identifier, setIdentifier] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Step 1: Request Reset Token / Link
  const handleRequestReset = async () => {
    const cleanId = identifier.trim();
    if (!cleanId) {
      setError(t('validation.required'));
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await authApi.forgotPassword(cleanId);
      setLoading(false);
      setSuccessMessage(res.message || t('auth.verificationSent'));
      setStep('reset');
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Failed to send reset code');
    }
  };

  // Step 2: Set New Password & Verify Token
  const handleCompleteReset = async () => {
    if (!token.trim()) {
      setError('Please enter the reset code or token');
      return;
    }
    if (newPassword.length < 6) {
      setError(t('validation.passwordLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('validation.passwordMismatch'));
      return;
    }

    setError('');
    setLoading(true);

    try {
      await authApi.resetPassword({
        email: identifier.includes('@') ? identifier.trim() : undefined,
        token: token.trim(),
        newPassword,
      });

      // Attempt automatic sign-in with the new credentials
      try {
        await login(identifier.trim(), newPassword);
        setLoading(false);
        router.replace('/(tabs)' as any);
        return;
      } catch {
        // If auto-login fails, redirect to login
        setLoading(false);
        router.replace('/(auth)/login' as any);
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Failed to update password');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={t('auth.resetPassword')}
        showBack
        onBackPress={() => {
          if (step === 'reset') {
            setStep('request');
            setError('');
          } else {
            router.back();
          }
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Brand Logo & Header */}
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
          <Text style={styles.title}>{t('auth.resetPassword')}</Text>
          <Text style={styles.subtitle}>
            {step === 'request'
              ? t('auth.resetPasswordDesc')
              : 'Enter the verification code and your new secure password.'}
          </Text>
        </View>

        {/* STEP 1: Request Code */}
        {step === 'request' ? (
          <View style={styles.card}>
            <AppInput
              label={t('auth.emailOrPhone')}
              placeholder="e.g. user@example.com or +251 91..."
              value={identifier}
              onChangeText={(text) => {
                setIdentifier(text);
                if (error) setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<Ionicons name="mail-outline" size={18} color={Colors.primary} />}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.actionContainer}>
              <AppButton
                title={t('auth.sendResetLink')}
                onPress={handleRequestReset}
                loading={loading}
                disabled={loading || !identifier.trim()}
                variant="primary"
                size="lg"
              />
            </View>
          </View>
        ) : (
          /* STEP 2: Enter Code and New Password */
          <View style={styles.card}>
            {successMessage ? (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={16} color={Colors.primary} />
                <Text style={styles.infoText}>{successMessage}</Text>
              </View>
            ) : null}

            <AppInput
              label={t('auth.resetToken')}
              placeholder="Enter 6-digit code or reset token"
              value={token}
              onChangeText={(text) => {
                setToken(text);
                if (error) setError('');
              }}
              keyboardType="number-pad"
              leftIcon={<Ionicons name="key-outline" size={18} color={Colors.primary} />}
            />

            <AppInput
              label={t('auth.newPassword')}
              placeholder="At least 6 characters"
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
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

            <AppInput
              label={t('auth.confirmPassword')}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (error) setError('');
              }}
              secureTextEntry={!showPassword}
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.actionContainer}>
              <AppButton
                title={t('auth.createPassword')}
                onPress={handleCompleteReset}
                loading={loading}
                disabled={loading || !token.trim() || !newPassword || !confirmPassword}
                variant="primary"
                size="lg"
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setStep('request')}
              style={styles.resendWrapper}>
              <Text style={styles.resendText}>{t('auth.resendCode')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Back to Sign In Link */}
        <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.replace('/(auth)/login' as any)}>
            <Text style={styles.footerLink}>{t('auth.alreadyHaveAccount')}</Text>
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
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  infoText: {
    fontSize: Typography.fontSize.xs,
    color: '#1D4ED8',
    flex: 1,
    lineHeight: 18,
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
  resendWrapper: {
    alignSelf: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  resendText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  footerLink: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
});
