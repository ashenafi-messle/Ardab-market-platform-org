import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRequestOtp = async () => {
    setErrorMessage(null);
    const cleanEmail = email.trim();

    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setErrorMessage('Please enter your valid registered agent email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await agentApi.requestPasswordResetOtp(cleanEmail);
      router.push({
        pathname: '/(auth)/reset-password',
        params: { email: cleanEmail },
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to send password reset code.');
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
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
            <Text style={styles.backText}>Back to Sign In</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-open-outline" size={32} color={Colors.primary} />
            </View>

            <Text style={styles.title}>Reset Agent Password</Text>
            <Text style={styles.subtitle}>
              Enter your registered email address and we will send you a verification code to reset your password.
            </Text>
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={Colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.formCard}>
            <AppInput
              label="Registered Email"
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
            />

            <AppButton
              title="Send Reset Code"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              onPress={handleRequestOtp}
              style={{ marginTop: Spacing.sm }}
            />
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
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
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
});

