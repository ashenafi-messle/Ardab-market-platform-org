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
import { useAgentAuth } from '../../store/AgentAuthContext';
import { evaluatePasswordStrength } from '../../utils/validators';

export default function CreatePasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email: string; activationToken: string }>();

  const email = params.email || '';
  const activationToken = params.activationToken || '';

  const { activateAccount } = useAgentAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const strength = evaluatePasswordStrength(password);

  const handleSetPassword = async () => {
    setErrorMessage(null);

    if (!strength.hasMinLength) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }
    if (strength.score < 2) {
      setErrorMessage('Please choose a stronger password matching the criteria below.');
      return;
    }

    setIsSubmitting(true);
    try {
      await activateAccount(activationToken, password, rememberMe);
      setSuccessModalVisible(true);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Failed to complete account activation. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueToDashboard = () => {
    setSuccessModalVisible(false);
    router.replace('/(tabs)');
  };

  const requirements = [
    { label: 'At least 8 characters', met: strength.hasMinLength },
    { label: 'Uppercase & lowercase letters', met: strength.hasUppercase && strength.hasLowercase },
    { label: 'At least one number', met: strength.hasNumber },
    { label: 'At least one special symbol (@, #, $, etc.)', met: strength.hasSpecial },
  ];

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
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={32} color={Colors.primary} />
            </View>

            <Text style={styles.title}>Create New Password</Text>
            <Text style={styles.subtitle}>
              Set a secure password for your Ardab Market Agent account ({email}).
            </Text>
          </View>

          {/* Error Notice */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={Colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Form Card */}
          <View style={styles.formCard}>
            <AppInput
              label="New Password"
              placeholder="Create strong password"
              value={password}
              onChangeText={(txt) => {
                setPassword(txt);
                setErrorMessage(null);
              }}
              secureTextEntry
              leftIcon="lock-closed-outline"
            />

            {/* Password Strength Indicator */}
            {password.length > 0 ? (
              <View style={styles.strengthBox}>
                <View style={styles.strengthHeader}>
                  <Text style={styles.strengthTitle}>Password Strength:</Text>
                  <Text style={[styles.strengthBadge, { color: strength.color }]}>
                    {strength.label}
                  </Text>
                </View>

                {/* 4 strength bars */}
                <View style={styles.barsRow}>
                  {[1, 2, 3, 4].map((bar) => (
                    <View
                      key={bar}
                      style={[
                        styles.bar,
                        {
                          backgroundColor:
                            strength.score >= bar ? strength.color : Colors.borderLight,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <AppInput
              label="Confirm New Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={(txt) => {
                setConfirmPassword(txt);
                setErrorMessage(null);
              }}
              secureTextEntry
              leftIcon="checkmark-done-outline"
            />

            {/* Requirements Checklist */}
            <View style={styles.reqCard}>
              <Text style={styles.reqHeader}>Password Requirements:</Text>
              {requirements.map((req, idx) => (
                <View key={idx} style={styles.reqRow}>
                  <Ionicons
                    name={req.met ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={req.met ? Colors.success : Colors.textMuted}
                  />
                  <Text style={[styles.reqText, req.met && styles.reqTextMet]}>
                    {req.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Remember Me Option */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setRememberMe((prev: boolean) => !prev)}
              style={styles.rememberMeRow}
            >
              <Ionicons
                name={rememberMe ? 'checkbox' : 'square-outline'}
                size={20}
                color={rememberMe ? Colors.primary : Colors.textMuted}
              />
              <Text style={styles.rememberMeText}>
                Remember my login securely on this device
              </Text>
            </TouchableOpacity>

            <AppButton
              title="Set Password & Activate"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              onPress={handleSetPassword}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Screen 4: Account Activated Success Modal */}
      <Modal
        visible={successModalVisible}
        onClose={handleContinueToDashboard}
        title="Activation Complete"
      >
        <View style={styles.successModalContent}>
          <View style={styles.successModalIconCircle}>
            <Ionicons name="checkmark-done-circle" size={56} color={Colors.primary} />
          </View>

          <Text style={styles.successModalTitle}>
            Your Ardab Market Agent account is now activated!
          </Text>

          <Text style={styles.successModalDesc}>
            You can now view your commission balance in ETB, monitor accepted customer orders, and manage your integrated customer list.
          </Text>

          <AppButton
            title="Continue to Dashboard"
            variant="primary"
            size="lg"
            onPress={handleContinueToDashboard}
            style={styles.modalBtn}
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
    paddingBottom: Spacing.xxl * 1.5,
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
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
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
  strengthBox: {
    marginBottom: Spacing.md,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  strengthTitle: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  strengthBadge: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  barsRow: {
    flexDirection: 'row',
    gap: 4,
    height: 4,
    marginTop: 2,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
  },
  reqCard: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  reqHeader: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 3,
  },
  reqText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  reqTextMet: {
    color: Colors.text,
    fontWeight: Typography.fontWeight.medium,
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: Spacing.xs,
  },
  rememberMeText: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    flex: 1,
  },
  successModalContent: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  successModalIconCircle: {
    marginBottom: Spacing.md,
  },
  successModalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  successModalDesc: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  modalBtn: {
    width: '100%',
  },
});
