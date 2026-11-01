import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AppHeader, AppButton, AppInput, Modal } from '../../components/common';
import { evaluatePasswordStrength } from '../../utils/validators';

export default function SecurityScreen() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const strength = evaluatePasswordStrength(newPassword);

  const handleChangePassword = async () => {
    setErrorMessage(null);

    if (!currentPassword) {
      setErrorMessage('Please enter your current account password.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((res) => setTimeout(res, 600));
      setSuccessModalVisible(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Security & Password"
        subtitle="Manage your agent account credentials"
        showBack
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={Colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <AppInput
              label="Current Password"
              placeholder="Enter current password"
              value={currentPassword}
              onChangeText={(txt) => {
                setCurrentPassword(txt);
                setErrorMessage(null);
              }}
              secureTextEntry
              leftIcon="lock-closed-outline"
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
              leftIcon="key-outline"
            />

            {newPassword.length > 0 ? (
              <View style={styles.strengthBox}>
                <View style={styles.strengthRow}>
                  <Text style={styles.strengthLabel}>Password Strength:</Text>
                  <Text style={[styles.strengthValue, { color: strength.color }]}>
                    {strength.label}
                  </Text>
                </View>
                <View style={styles.bars}>
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
              title="Update Password"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              onPress={handleChangePassword}
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={successModalVisible}
        onClose={() => {
          setSuccessModalVisible(false);
          router.back();
        }}
        title="Password Updated"
      >
        <View style={styles.modalContent}>
          <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
          <Text style={styles.modalTitle}>Password Changed Successfully</Text>
          <Text style={styles.modalDesc}>
            Your agent account password has been updated and secured.
          </Text>
          <AppButton
            title="Done"
            variant="primary"
            onPress={() => {
              setSuccessModalVisible(false);
              router.back();
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
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  strengthBox: {
    marginBottom: Spacing.md,
  },
  strengthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  strengthLabel: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  strengthValue: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  bars: {
    flexDirection: 'row',
    gap: 4,
    height: 4,
  },
  bar: {
    flex: 1,
    borderRadius: 2,
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
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});

