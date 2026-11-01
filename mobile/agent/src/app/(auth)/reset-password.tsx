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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AppButton, AppInput, Modal } from '../../components/common';
import { agentApi } from '../../services/agentApi';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string }>();
  const email = params.email || '';

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const handleReset = async () => {
    setErrorMessage(null);

    if (otp.length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await agentApi.resetPassword(email, otp, newPassword);
      setSuccessModalVisible(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Password reset failed. Please check the code.');
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
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Create New Password</Text>
            <Text style={styles.subtitle}>
              Enter the reset code sent to {email} and create your new password.
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
              label="6-Digit Reset Code"
              placeholder="e.g. 123456"
              value={otp}
              onChangeText={(txt) => {
                setOtp(txt.replace(/[^0-9]/g, '').slice(0, 6));
                setErrorMessage(null);
              }}
              keyboardType="number-pad"
              maxLength={6}
              leftIcon="keypad-outline"
            />

            <AppInput
              label="New Password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChangeText={(txt) => {
                setNewPassword(txt);
                setErrorMessage(null);
              }}
              secureTextEntry
              leftIcon="lock-closed-outline"
            />

            <AppInput
              label="Confirm New Password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChangeText={(txt) => {
                setConfirmPassword(txt);
                setErrorMessage(null);
              }}
              secureTextEntry
              leftIcon="checkmark-done-outline"
            />

            <AppButton
              title="Reset Password"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              onPress={handleReset}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={successModalVisible}
        onClose={() => {
          setSuccessModalVisible(false);
          router.replace('/(auth)/login');
        }}
        title="Password Reset Complete"
      >
        <View style={styles.modalContent}>
          <Ionicons name="checkmark-circle" size={50} color={Colors.success} />
          <Text style={styles.modalTitle}>Password Reset Successful!</Text>
          <Text style={styles.modalDesc}>
            Your password has been updated. You can now sign in with your new credentials.
          </Text>
          <AppButton
            title="Sign In Now"
            variant="primary"
            size="md"
            onPress={() => {
              setSuccessModalVisible(false);
              router.replace('/(auth)/login');
            }}
            style={{ width: '100%', marginTop: Spacing.md }}
          />
        </View>
      </Modal>
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
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 4,
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
  modalContent: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.fontSize.md + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  modalDesc: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
});

