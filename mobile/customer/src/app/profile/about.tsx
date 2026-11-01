// ==============================================================================
// Ardab Market - Mobile Customer About Screen & Developer Attribution
// ==============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { AppHeader, AppButton } from '@/components/common';
import { useApp } from '@/store';
import { t } from '@/localization';
import { ARDAB_LOGO_URL, ARDAB_LICENSE_URL } from '@/constants/branding';
import { openOfficialWebsite } from '@/services/storeService';

export default function AboutScreen() {
  const { language } = useApp();
  const [licenseModalVisible, setLicenseModalVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('profile.about')} showBack />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Hero Card */}
        <View style={styles.brandCard}>
          <View style={styles.logoWrapper}>
            <Image
              source={{ uri: ARDAB_LOGO_URL }}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.appName}>{t('common.appName')}</Text>

          {/* Platform Slogan Badge */}
          <View style={styles.sloganBadge}>
            <Ionicons name="sparkles" size={14} color={Colors.primary} style={styles.sloganIcon} />
            <Text style={styles.sloganText}>
              {language === 'am'
                ? '“ጥራትና ታማኝነት፣ እስከ ቤትዎ ድረስ!”'
                : '“Quality and Trust, Delivered to Your Door!”'}
            </Text>
          </View>

          <Text style={styles.versionText}>{t('profile.version')}</Text>

          <Text style={styles.brandDescription}>
            {t('profile.aboutDesc1')}
          </Text>
          <Text style={styles.brandDescription}>
            {t('profile.aboutDesc2')}
          </Text>
        </View>

        {/* Developer Attribution Card */}
        <View style={styles.developerCard}>
          <View style={styles.developerHeader}>
            <View style={styles.developerIconCircle}>
              <Ionicons name="code-working-outline" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.developerSectionSub}>
                {language === 'am' ? 'የሶፍትዌር ምህንድስና እና ሲስተም አርክቴክቸር' : 'Platform Engineering & Architecture'}
              </Text>
              <Text style={styles.developerCompany}>
                Developed By Ardab Tech Solutions S.C
              </Text>
            </View>
          </View>

          <View style={styles.developerDivider} />

          {/* Developer 1 */}
          <View style={styles.devRow}>
            <View style={styles.devAvatarBadge}>
              <Ionicons name="school-outline" size={18} color={Colors.primary} />
            </View>
            <View style={styles.devInfo}>
              <Text style={styles.devName}>Ambelu Endalew (Phd Researcher)</Text>
              <Text style={styles.devRoleSubtitle}>
                {language === 'am' ? 'የሲስተም አርክቴክቸር እና ምርምር መሪ' : 'System Architecture & Lead Researcher'}
              </Text>
            </View>
          </View>

          {/* Developer 2 */}
          <View style={styles.devRow}>
            <View style={styles.devAvatarBadge}>
              <Ionicons name="terminal-outline" size={18} color={Colors.primary} />
            </View>
            <View style={styles.devInfo}>
              <Text style={styles.devName}>Ashenafi Messle (Software Engineer)</Text>
              <Text style={styles.devRoleSubtitle}>
                {language === 'am' ? 'ሙሉ-ስታክ ሶፍትዌር ምህንድስና' : 'Full-Stack Software Engineering'}
              </Text>
            </View>
          </View>
        </View>

        {/* Official License & Verification Card */}
        <View style={styles.licenseCard}>
          <View style={styles.licenseCardHeader}>
            <Ionicons name="shield-checkmark" size={22} color={Colors.primary} />
            <Text style={styles.licenseCardTitle}>
              {language === 'am' ? 'ህጋዊ የንግድ ምዝገባ እና ፈቃድ' : 'Official Commercial Registration'}
            </Text>
          </View>
          <Text style={styles.licenseCardDesc}>
            {language === 'am'
              ? 'አርዳብ ገበያ በኢትዮጵያ ንግድና ቀጣናዊ ትስስር ሚኒስቴር ህጋዊ የንግድ ፈቃድ የተመዘገበ የታመነ የገበያ መድረክ ነው።'
              : 'Ardab Market operates with active Ministry of Trade commercial registration, ensuring complete legal consumer trust and verified transactions.'}
          </Text>
          <View style={styles.licenseActionRow}>
            <AppButton
              title={language === 'am' ? 'ንግድ ፈቃድ ይመልከቱ' : 'View Commercial License'}
              variant="outline"
              size="sm"
              onPress={() => setLicenseModalVisible(true)}
              style={styles.licenseBtn}
            />
            <AppButton
              title={language === 'am' ? 'ድረ-ገጽ ጎብኝ' : 'Visit Website'}
              variant="secondary"
              size="sm"
              onPress={openOfficialWebsite}
              style={styles.licenseBtn}
            />
          </View>
        </View>

        {/* Legal Footer */}
        <View style={styles.legalFooter}>
          <Text style={styles.legalText}>
            © {new Date().getFullYear()} Ardab Market Platform.
          </Text>
          <Text style={styles.legalSubtext}>
            {language === 'am'
              ? 'በአርዳብ ቴክ ሶሉሽንስ አ.ማ. የበለፀገ — መብቱ በህግ የተጠበቀ ነው።'
              : 'Powered by Ardab Tech Solutions S.C. All rights reserved.'}
          </Text>
        </View>
      </ScrollView>

      {/* Commercial License Modal */}
      <Modal
        visible={licenseModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLicenseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {language === 'am' ? 'ህጋዊ የንግድ ፈቃድ' : 'Official Business License'}
              </Text>
              <TouchableOpacity
                onPress={() => setLicenseModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close-circle" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.licenseImageWrapper}>
              <Image
                source={{ uri: ARDAB_LICENSE_URL }}
                style={styles.licenseImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.licenseModalNote}>
              {language === 'am'
                ? 'አርዳብ ገበያ በህግ የተመዘገበና የመንግስት ንግድ ፈቃድ ያሟላ የታመነ መድረክ ነው።'
                : 'Ardab Market operates with active government commercial licensing and full regulatory compliance.'}
            </Text>

            <AppButton
              title={t('common.close') || 'Close'}
              variant="primary"
              onPress={() => setLicenseModalVisible(false)}
              style={{ marginTop: Spacing.md }}
            />
          </View>
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
    padding: Spacing.md,
    paddingBottom: Spacing.xl * 2,
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
    width: 90,
    height: 90,
    borderRadius: Radius.round,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  appName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  sloganBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
    marginVertical: Spacing.xs,
  },
  sloganIcon: {
    marginRight: Spacing.xs,
  },
  sloganText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primaryDark,
    textAlign: 'center',
  },
  versionText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  brandDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  developerCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.primaryMuted,
    ...Shadows.sm,
  },
  developerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  developerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  developerSectionSub: {
    fontSize: Typography.fontSize.xs - 1,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  developerCompany: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: 2,
  },
  developerDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm + 2,
  },
  devAvatarBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.round,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  devInfo: {
    flex: 1,
  },
  devName: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  devRoleSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  licenseCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md + 2,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  licenseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  licenseCardTitle: {
    fontSize: Typography.fontSize.sm + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  licenseCardDesc: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  licenseActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  licenseBtn: {
    flex: 1,
  },
  legalFooter: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  legalText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  legalSubtext: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.textMuted,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  licenseImageWrapper: {
    height: 300,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  licenseImage: {
    width: '100%',
    height: '100%',
  },
  licenseModalNote: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 16,
  },
});

