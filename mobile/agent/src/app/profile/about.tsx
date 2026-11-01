import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AppHeader } from '../../components/common';
import {
  APP_NAME,
  APP_VERSION,
  BRAND_SLOGAN_EN,
  BRAND_SLOGAN_AM,
  ARDAB_LOGO_URL,
} from '../../constants/branding';

export default function AboutAgentScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="About Ardab Market Agent" showBack />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Card */}
        <View style={styles.brandCard}>
          <View style={styles.logoWrapper}>
            <Image
              source={{ uri: ARDAB_LOGO_URL }}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.appName}>{APP_NAME}</Text>

          <View style={styles.sloganBadge}>
            <Ionicons name="sparkles" size={14} color={Colors.primary} />
            <Text style={styles.sloganText}>“{BRAND_SLOGAN_EN}”</Text>
          </View>
          <Text style={styles.sloganTextAm}>“{BRAND_SLOGAN_AM}”</Text>

          <Text style={styles.versionText}>Version {APP_VERSION}</Text>

          <Text style={styles.desc}>
            Ardab Market Agent is the official dedicated mobile business application for verified Ardab Market agents across Ethiopia. It provides transparent financial commission tracking, customer order attribution monitoring, and community integration management.
          </Text>
        </View>

        {/* Developer Attribution Card */}
        <View style={styles.devCard}>
          <View style={styles.devHeader}>
            <View style={styles.devIconCircle}>
              <Ionicons name="code-working-outline" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.devSubtitle}>Platform Engineering & Architecture</Text>
              <Text style={styles.devCompany}>Developed By Ardab Tech Solutions S.C</Text>
            </View>
          </View>

          <View style={styles.devDivider} />

          <View style={styles.devRow}>
            <View style={styles.devBadge}>
              <Ionicons name="school-outline" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.devName}>Ambelu Endalew (Phd Researcher)</Text>
              <Text style={styles.devRole}>System Architecture & Lead Researcher</Text>
            </View>
          </View>

          <View style={styles.devRow}>
            <View style={styles.devBadge}>
              <Ionicons name="terminal-outline" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.devName}>Ashenafi Messle (Software Engineer)</Text>
              <Text style={styles.devRole}>Full-Stack Software Engineering</Text>
            </View>
          </View>
        </View>

        {/* Legal & Compliance Notice */}
        <View style={styles.legalCard}>
          <View style={styles.legalHeader}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
            <Text style={styles.legalTitle}>Official Commercial Verification</Text>
          </View>
          <Text style={styles.legalDesc}>
            Ardab Market operates with active Ministry of Trade commercial registration. Agent accounts are approved exclusively by the Super Admin team in compliance with Ethiopian ecommerce and financial regulations.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerCopy}>
            © {new Date().getFullYear()} Ardab Market Platform.
          </Text>
          <Text style={styles.footerSub}>
            Powered by Ardab Tech Solutions S.C. All rights reserved.
          </Text>
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
  brandCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
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
  sloganBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
    marginTop: Spacing.xs,
  },
  sloganText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  sloganTextAm: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  versionText: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  desc: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: Spacing.xs,
  },
  devCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.primaryMuted,
    ...Shadows.sm,
  },
  devHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  devIconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  devSubtitle: {
    fontSize: Typography.fontSize.tiny,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  devCompany: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: 1,
  },
  devDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.md,
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: 4,
  },
  devBadge: {
    width: 34,
    height: 34,
    borderRadius: Radius.round,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  devName: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  devRole: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textSecondary,
  },
  legalCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  legalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  legalTitle: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  legalDesc: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  footerCopy: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  footerSub: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
    marginTop: 2,
  },
});

