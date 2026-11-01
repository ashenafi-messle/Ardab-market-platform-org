import React, { useState, useEffect } from 'react';
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
import { useAgentAuth } from '../../store/AgentAuthContext';
import { isValidEmail } from '../../utils/validators';
import { ARDAB_LOGO_URL, BRAND_SLOGAN_EN, APP_NAME } from '../../constants/branding';

export default function LoginScreen() {
  const router = useRouter();
  const { login, rememberMeEnabled, rememberedEmail, rememberedPassword } = useAgentAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-fill remembered credentials if available
  useEffect(() => {
    if (rememberMeEnabled && rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
      if (rememberedPassword) {
        setPassword(rememberedPassword);
      }
    }
  }, [rememberMeEnabled, rememberedEmail, rememberedPassword]);

  const handleSignIn = async () => {
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your registered agent email address.');
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(cleanEmail, password, rememberMe);
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Invalid email or password. Please verify your credentials.');
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
          {/* Logo & Branding */}
          <View style={styles.header}>
            <View style={styles.logoWrapper}>
              <Image
                source={{ uri: ARDAB_LOGO_URL }}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.appName}>{APP_NAME}</Text>
            <Text style={styles.tagline}>{BRAND_SLOGAN_EN}</Text>

            <View style={styles.welcomeBox}>
              <Text style={styles.welcomeTitle}>Agent Portal Sign In</Text>
              <Text style={styles.welcomeSubtitle}>
                Access your commission balance, accepted orders, and customer management.
              </Text>
            </View>
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
              label="Registered Email Address"
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

            <AppInput
              label="Account Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(txt) => {
                setPassword(txt);
                setErrorMessage(null);
              }}
              secureTextEntry
              leftIcon="lock-closed-outline"
            />

            {/* Remember Me & Forgot Password */}
            <View style={styles.optionsRow}>
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
                <Text style={styles.rememberMeText}>Remember Me</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/(auth)/forgot-password')}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <AppButton
              title="Sign In to Agent Portal"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              onPress={handleSignIn}
              style={{ marginTop: Spacing.md }}
            />
          </View>

          {/* First-Time Agent Activation Link */}
          <View style={styles.activationCard}>
            <View style={styles.activationIconCircle}>
              <Ionicons name="key-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.activationTextWrapper}>
              <Text style={styles.activationTitle}>New to Ardab Market Agent?</Text>
              <Text style={styles.activationDesc}>
                If you were registered by Super Admin, activate your account with your email OTP.
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(auth)/activate')}
              style={styles.activateButton}
            >
              <Text style={styles.activateButtonText}>Activate Account</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Super Admin Notice */}
          <View style={styles.footerNotice}>
            <Ionicons name="shield-checkmark-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.footerNoticeText}>
              Ardab Market agents are pre-verified and registered exclusively by the Super Admin team.
            </Text>
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
    paddingBottom: Spacing.xxl * 1.5,
  },
  header: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  logoWrapper: {
    width: 80,
    height: 80,
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
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  appName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  tagline: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  welcomeBox: {
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  welcomeTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  welcomeSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
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
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rememberMeText: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  forgotPasswordText: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
  activationCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
    marginTop: Spacing.lg,
    alignItems: 'center',
    textAlign: 'center',
  },
  activationIconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.round,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  activationTextWrapper: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  activationTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  activationDesc: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 16,
    paddingHorizontal: Spacing.sm,
  },
  activateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  activateButtonText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  footerNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  footerNoticeText: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 15,
    flex: 1,
  },
});
