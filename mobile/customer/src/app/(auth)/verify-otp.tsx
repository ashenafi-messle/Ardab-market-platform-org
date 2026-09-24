import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { AppHeader, AppButton } from '@/components/common';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/store';
import { t } from '@/localization';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { verifyEmailOtp, verifyTelegramOtp, requestEmailOtp, requestTelegramOtp } = useAuth();
  const { language } = useApp();

  const method = (params.method as 'email' | 'telegram') || 'email';
  const identifier = (params.identifier as string) || (method === 'email' ? 'customer@ardab.com' : '+251 91 123 4567');
  const city = (params.city as string) || 'Gondar';
  const botUrl = (params.botUrl as string) || 'https://t.me/ArdabMarketBot';
  const devOtp = (params.devOtp as string) || '';

  // 6-digit OTP state
  const initialDigits = devOtp && devOtp.length === 6 ? devOtp.split('') : ['', '', '', '', '', ''];
  const [otp, setOtp] = useState<string[]>(initialDigits);
  const [timer, setTimer] = useState<number>(60);
  const [loading, setLoading] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [resendNotice, setResendNotice] = useState<string>('');

  // 6 Input Refs for smooth auto-focus navigation
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // 60-second countdown timer
  useEffect(() => {
    let interval: any = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  const handleOtpChange = (text: string, index: number) => {
    setError('');
    // Handle pasting a full 6-digit code
    if (text.length > 1) {
      const sanitized = text.replace(/\D/g, '').slice(0, 6);
      if (sanitized.length > 0) {
        const next = [...otp];
        sanitized.split('').forEach((char, i) => {
          if (i < 6) next[i] = char;
        });
        setOtp(next);
        const focusIdx = Math.min(sanitized.length, 5);
        inputRefs.current[focusIdx]?.focus();
      }
      return;
    }

    const next = [...otp];
    next[index] = text.replace(/\D/g, '');
    setOtp(next);

    // Auto-advance focus to next box
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const next = [...otp];
        next[index - 1] = '';
        setOtp(next);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerify = async () => {
    const fullCode = otp.join('');
    if (fullCode.length < 6) {
      setError(t('validation.required'));
      return;
    }

    setError('');
    setLoading(true);

    try {
      let result: any = null;
      if (method === 'email') {
        result = await verifyEmailOtp(identifier, fullCode);
      } else {
        result = await verifyTelegramOtp(identifier, fullCode);
      }

      setLoading(false);

      // Navigate to Step 3: Password Creation
      router.push({
        pathname: '/(auth)/create-password' as any,
        params: {
          method,
          email: method === 'email' ? identifier : '',
          phone: method === 'telegram' ? identifier : '',
          city,
          verificationToken: result?.data?.verificationToken || result?.verificationToken || '',
        },
      });
    } catch (err: any) {
      setLoading(false);
      setError(err.message || t('errors.general'));
    }
  };

  const handleResend = async () => {
    if (timer > 0 || resending) return;
    setResending(true);
    setError('');
    setResendNotice('');

    try {
      let res: any = null;
      if (method === 'email') {
        res = await requestEmailOtp(identifier, city);
      } else {
        res = await requestTelegramOtp(identifier, city);
      }
      setResending(false);
      setTimer(60);
      setResendNotice(t('auth.codeResent'));
      if (res?.devOtp) {
        setOtp(res.devOtp.split(''));
      }
    } catch (err: any) {
      setResending(false);
      setError(err.message || t('errors.general'));
    }
  };

  const handleOpenTelegram = () => {
    Linking.openURL(botUrl).catch(() => {
      Alert.alert(t('common.appName'), 'Could not open Telegram. Please open @ArdabMarketBot manually in your Telegram app.');
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={t('auth.verification')}
        showBack
        onBackPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(auth)/register' as any);
          }
        }}
      />

      <View style={styles.container}>
        {/* Verification Icon Badge */}
        <View style={styles.badgeWrapper}>
          <View style={styles.iconCircle}>
            <Ionicons
              name={method === 'email' ? 'mail-open-outline' : 'paper-plane-outline'}
              size={36}
              color={Colors.primary}
            />
          </View>
        </View>

        {/* Title & Instructions */}
        <Text style={styles.title}>{t('auth.verification')}</Text>
        <Text style={styles.subtitle}>
          {method === 'email'
            ? t('auth.enterEmailOtp')
            : t('auth.enterTelegramOtp')}
        </Text>

        {/* Target Identifier Pill with change option */}
        <View style={styles.identifierPill}>
          <Text style={styles.identifierText}>{identifier}</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={styles.changeBtn}>
            <Text style={styles.changeBtnText}>
              {method === 'email' ? t('auth.changeEmail') : t('auth.changePhone')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Telegram Action Helper */}
        {method === 'telegram' ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleOpenTelegram}
            style={styles.telegramBotBtn}>
            <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
            <Text style={styles.telegramBotBtnText}>{t('auth.openTelegramBot')}</Text>
            <Ionicons name="open-outline" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}

        {/* 6 Individual Numeric OTP Input Boxes */}
        <View style={styles.otpGrid}>
          {otp.map((digit, idx) => {
            const isFilled = digit.length > 0;
            return (
              <TextInput
                key={idx}
                ref={(ref) => {
                  inputRefs.current[idx] = ref;
                }}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, idx)}
                onKeyPress={(e) => handleKeyPress(e, idx)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                textAlign="center"
                style={[
                  styles.otpBox as any,
                  isFilled && (styles.otpBoxFilled as any),
                  error ? (styles.otpBoxError as any) : null,
                ]}
              />
            );
          })}
        </View>

        {/* Error or Resend Message */}
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {resendNotice ? (
          <View style={styles.noticeBox}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.noticeText}>{resendNotice}</Text>
          </View>
        ) : null}

        {/* Resend Cooldown / Button */}
        <View style={styles.resendSection}>
          {timer > 0 ? (
            <Text style={styles.timerText}>
              {t('auth.resendCode')} in <Text style={styles.timerBold}>{timer}s</Text>
            </Text>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleResend}
              disabled={resending}
              style={styles.resendBtn}>
              {resending ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.resendBtnText}>{t('auth.resendCode')}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Primary Action Button */}
        <View style={styles.buttonWrapper}>
          <AppButton
            title={t('auth.verify')}
            loading={loading}
            onPress={handleVerify}
            disabled={loading || otp.join('').length < 6}
            variant="primary"
            size="lg"
          />
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
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    alignItems: 'center',
  },
  badgeWrapper: {
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.primaryLight + '25',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: Spacing.md,
  },
  identifierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  identifierText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  changeBtn: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    paddingLeft: Spacing.sm,
  },
  changeBtnText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  telegramBotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0088cc',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  telegramBotBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: '#FFFFFF',
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    ...Shadows.sm,
  },
  otpBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight + '10',
  },
  otpBoxError: {
    borderColor: Colors.error,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight + '25',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.md,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight + '25',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.md,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  noticeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.success,
  },
  resendSection: {
    marginBottom: Spacing.xl,
  },
  timerText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
  },
  timerBold: {
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  resendBtn: {
    paddingVertical: Spacing.xs,
  },
  resendBtnText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  buttonWrapper: {
    width: '100%',
  },
});
