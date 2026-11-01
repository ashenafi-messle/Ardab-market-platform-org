import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AppButton, AppInput } from '../../components/common';
import { agentApi } from '../../services/agentApi';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string; maskedEmail: string }>();

  const email = params.email || 'your registered email';
  const maskedEmail = params.maskedEmail || email;

  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  // 60-second countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleVerify = async () => {
    setErrorMessage(null);
    const cleanOtp = otp.trim();

    if (cleanOtp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await agentApi.verifyActivationOtp(email, cleanOtp);
      // Navigate to password creation with activation token
      router.push({
        pathname: '/(auth)/create-password',
        params: {
          email,
          activationToken: res.activationToken,
        },
      });
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Invalid or expired verification code. Please check and try again.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || isResending) return;
    setIsResending(true);
    setErrorMessage(null);
    setResendSuccess(false);

    try {
      await agentApi.requestActivationOtp(email);
      setCountdown(60);
      setCanResend(false);
      setResendSuccess(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header navigation */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
            <Text style={styles.backText}>Change Email</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-open-outline" size={32} color={Colors.primary} />
            </View>

            <Text style={styles.title}>Enter Verification Code</Text>
            <Text style={styles.message}>
              We sent a verification code to your registered email address. Enter the code to continue.
            </Text>

            <View style={styles.emailBadge}>
              <Ionicons name="lock-closed" size={14} color={Colors.primaryDark} />
              <Text style={styles.emailBadgeText}>{maskedEmail}</Text>
            </View>
          </View>

          {/* Success toast for resend */}
          {resendSuccess ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.successText}>New verification code sent successfully!</Text>
            </View>
          ) : null}

          {/* Error Notice */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={Colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.formCard}>
            <AppInput
              label="6-Digit Verification Code"
              placeholder="e.g. 123456"
              value={otp}
              onChangeText={(txt) => {
                // allow only numbers and up to 6 chars
                const clean = txt.replace(/[^0-9]/g, '').slice(0, 6);
                setOtp(clean);
                setErrorMessage(null);
              }}
              keyboardType="number-pad"
              maxLength={6}
              leftIcon="keypad-outline"
              style={styles.otpInput}
            />

            <AppButton
              title="Verify Code"
              variant="primary"
              size="lg"
              loading={isVerifying}
              onPress={handleVerify}
              style={{ marginTop: Spacing.sm }}
            />

            {/* Resend Action */}
            <View style={styles.resendWrapper}>
              {canResend ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleResend}
                  disabled={isResending}
                  style={styles.resendBtn}
                >
                  <Text style={styles.resendText}>Resend Code</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.countdownText}>
                  Resend code in <Text style={styles.countdownSec}>{countdown}s</Text>
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  backText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    marginTop: Spacing.md,
  },
  emailBadgeText: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  successText: {
    fontSize: Typography.fontSize.xs + 1,
    color: '#065F46',
    fontWeight: Typography.fontWeight.medium,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.danger,
    fontWeight: Typography.fontWeight.medium,
  },
  formCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  otpInput: {
    letterSpacing: 6,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
  },
  resendWrapper: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  resendBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  resendText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  countdownText: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.textMuted,
  },
  countdownSec: {
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.bold,
  },
});

