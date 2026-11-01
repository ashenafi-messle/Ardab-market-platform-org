import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AppButton, AppInput } from '../../components/common';
import { agentApi } from '../../services/agentApi';
import { isValidEmail } from '../../utils/validators';
import { ARDAB_LOGO_URL, APP_NAME } from '../../constants/branding';

export default function ActivateAccountScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSendOtp = async () => {
    setErrorMessage(null);
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setErrorMessage('Please enter the email address registered by Ardab Market.');
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await agentApi.requestActivationOtp(cleanEmail);
      // Navigate to OTP verification screen with email and maskedEmail
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          email: cleanEmail,
          maskedEmail: res.maskedEmail,
        },
      });
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Unable to find an agent registered with this email address.'
      );
    } finally {
      setIsSubmitting(false);
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
          {/* Top Back Navigation */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
            <Text style={styles.backText}>Back to Sign In</Text>
          </TouchableOpacity>

          {/* Logo & Header */}
          <View style={styles.header}>
            <View style={styles.logoWrapper}>
              <Image
                source={{ uri: ARDAB_LOGO_URL }}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.appName}>{APP_NAME}</Text>
            <Text style={styles.badgeText}>First-Time Account Activation</Text>

            <Text style={styles.description}>
              Enter the email address registered by Ardab Market to activate your agent account.
            </Text>
          </View>

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
              label="Registered Agent Email"
              placeholder="e.g. agent@ardabmarket.com"
              value={email}
              onChangeText={(txt) => {
                setEmail(txt);
                setErrorMessage(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon="mail-outline"
              helperText="We will send a 6-digit one-time verification code to this address."
            />

            <AppButton
              title="Send Verification Code"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              onPress={handleSendOtp}
              style={{ marginTop: Spacing.sm }}
            />
          </View>

          {/* Instructions Box */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Verification Instructions</Text>
              <Text style={styles.infoText}>
                • Make sure you use the exact email address provided to your Ardab Market account manager.
              </Text>
              <Text style={styles.infoText}>
                • Only legally approved agents registered by the Super Admin can activate accounts.
              </Text>
              <Text style={styles.infoText}>
                • The verification code expires within 10 minutes.
              </Text>
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
  logoWrapper: {
    width: 72,
    height: 72,
    borderRadius: Radius.round,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  logoImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  appName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  badgeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.semibold,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    marginTop: Spacing.xs,
  },
  description: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
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
    marginBottom: Spacing.lg,
  },
  infoCard: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  infoTitle: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  infoText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
});

