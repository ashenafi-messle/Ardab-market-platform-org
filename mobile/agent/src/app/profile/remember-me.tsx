import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AppHeader, AppButton } from '../../components/common';
import { useAgentAuth } from '../../store/AgentAuthContext';
import { secureStorage } from '../../services/secureStorage';
import { maskEmail } from '../../utils/validators';

export default function RememberMeSettingsScreen() {
  const { rememberMeEnabled, clearSavedCredentials, setRememberMe, agent } = useAgentAuth();

  const [isEnabled, setIsEnabled] = useState(rememberMeEnabled);
  const [savedEmail, setSavedEmail] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    async function checkSaved() {
      const res = await secureStorage.getRememberedCredentials();
      setIsEnabled(res.isEnabled);
      setSavedEmail(res.email);
      setSavedAt(res.rememberedAt);
    }
    checkSaved();
  }, [rememberMeEnabled]);

  const handleToggle = async (val: boolean) => {
    setIsEnabled(val);
    if (!val) {
      await clearSavedCredentials();
      setSavedEmail(null);
      setSavedAt(null);
    } else if (agent?.email) {
      await setRememberMe(true, agent.email);
      setSavedEmail(agent.email);
    }
  };

  const handleClear = async () => {
    await clearSavedCredentials();
    setIsEnabled(false);
    setSavedEmail(null);
    setSavedAt(null);
    Alert.alert('Saved Credentials Cleared', 'All saved login data has been removed from this device.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Saved Credentials"
        subtitle="Hardware-backed SecureStore login"
        showBack
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Toggle Card */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Remember Me on this Device</Text>
              <Text style={styles.toggleSubtitle}>
                Automatically restore your registered email for rapid sign-in.
              </Text>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={handleToggle}
              trackColor={{ false: Colors.border, true: Colors.primaryMuted }}
              thumbColor={isEnabled ? Colors.primary : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Stored Credentials Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Current Device Storage Status</Text>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Stored Identity</Text>
            <Text style={styles.fieldVal}>
              {savedEmail ? maskEmail(savedEmail) : 'None Saved'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Storage Mechanism</Text>
            <Text style={styles.fieldVal}>Hardware Keystore / SecureStore</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Password Exposure</Text>
            <Text style={[styles.fieldVal, { color: Colors.success }]}>
              Never Readable / Encrypted
            </Text>
          </View>

          {savedEmail ? (
            <AppButton
              title="Remove Saved Credentials"
              variant="outline"
              size="sm"
              onPress={handleClear}
              style={{ marginTop: Spacing.lg }}
            />
          ) : null}
        </View>

        {/* Security Explanation */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Enterprise-Grade Storage Standards</Text>
            <Text style={styles.infoText}>
              • Credentials are encrypted using hardware-backed Android KeyStore or iOS Keychain.
            </Text>
            <Text style={styles.infoText}>
              • Passwords and session tokens are never saved in plain text or ordinary AsyncStorage.
            </Text>
            <Text style={styles.infoText}>
              • Server-side authentication is always required before granting access to financial balances.
            </Text>
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: Spacing.xxl * 2,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  toggleTitle: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  toggleSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  cardHeading: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  fieldLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  fieldVal: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.xs + 2,
  },
  infoCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
  },
  infoTitle: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
    marginBottom: 4,
  },
  infoText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
});

