import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/theme';
import { useApp } from '@/store';
import { AppHeader, AppButton } from '@/components/common';
import { t } from '@/localization';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { login, language } = useApp();
  const email = (params.email as string) || 'customer@ardab.com';

  const [otp, setOtp] = useState(['4', '8', '2', '1', '', '']);
  const [timer, setTimer] = useState(45);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleVerify = () => {
    const fullCode = otp.join('');
    if (fullCode.length < 6) {
      setError(t('validation.required'));
      return;
    }
    setError('');
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      router.push({
        pathname: '/(auth)/create-password' as any,
        params: {
          email,
          city: 'Gondar',
          verificationToken: `tok_${Date.now()}`,
        },
      });
    }, 600);
  };

  const handleResend = () => {
    setTimer(60);
    setError('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('auth.verifyEmail')} showBack />
      <View style={styles.content}>
        {/* Icon & Message */}
        <View style={styles.iconCircle}>
          <Ionicons name="mail-open-outline" size={42} color={Colors.primary} />
        </View>

        <Text style={styles.title}>{t('auth.verification')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.verifyOtpDesc')}
        </Text>
        <Text style={styles.emailHighlight}>{email}</Text>

        {/* 6-Digit Code Mock Input Boxes */}
        <View style={styles.codeContainer}>
          {otp.map((digit, idx) => (
            <TextInput
              key={idx}
              value={digit}
              onChangeText={(val) => {
                const nextOtp = [...otp];
                nextOtp[idx] = val.slice(-1);
                setOtp(nextOtp);
                if (error) setError('');
              }}
              keyboardType="number-pad"
              maxLength={1}
              style={[
                styles.codeBox,
                digit ? styles.codeBoxFilled : undefined,
                error ? styles.codeBoxError : undefined,
              ]}
            />
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {success ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            <Text style={styles.successText}>{t('auth.accountCreated')}</Text>
          </View>
        ) : null}

        <AppButton
          title={t('auth.verify')}
          onPress={handleVerify}
          loading={loading}
          disabled={success}
          size="lg"
          style={styles.verifyBtn}
        />

        {/* Resend Code Section */}
        <View style={styles.resendSection}>
          {timer > 0 ? (
            <Text style={styles.resendTimerText}>
              {t('auth.resendCode')} ({timer}s)
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendActionText}>{t('auth.resendCode')}</Text>
            </TouchableOpacity>
          )}
        </View>
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  emailHighlight: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: Spacing.xxl,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  codeBox: {
    width: 46,
    height: 54,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    textAlign: 'center',
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  codeBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  codeBoxError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.fontSize.xs,
    marginBottom: Spacing.md,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successLight,
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  successText: {
    color: Colors.success,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  verifyBtn: {
    width: '100%',
    marginTop: Spacing.xs,
  },
  resendSection: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  resendTimerText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  resendActionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
});
