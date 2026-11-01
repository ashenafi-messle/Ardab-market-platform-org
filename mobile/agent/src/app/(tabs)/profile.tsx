import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { useAgentAuth } from '../../store/AgentAuthContext';
import { Badge, Modal, AppButton } from '../../components/common';
import { APP_NAME, APP_VERSION } from '../../constants/branding';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  isDestructive?: boolean;
}

function ProfileMenuItem({
  icon,
  title,
  subtitle,
  onPress,
  isDestructive = false,
}: MenuItemProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.menuItem}
    >
      <View
        style={[
          styles.menuIconCircle,
          isDestructive && { backgroundColor: Colors.dangerLight },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={isDestructive ? Colors.danger : Colors.primary}
        />
      </View>

      <View style={styles.menuTextWrapper}>
        <Text style={[styles.menuTitle, isDestructive && { color: Colors.danger }]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
      </View>

      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { agent, logout } = useAgentAuth();

  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const initials = agent?.name
    ? agent.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AG';

  const handleLogout = async () => {
    setLogoutModalVisible(false);
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <Text style={styles.name}>{agent?.name || 'Ardab Market Agent'}</Text>
          <Text style={styles.email}>{agent?.email}</Text>
          <Text style={styles.phone}>{agent?.phone}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.refBadge}>
              <Ionicons name="finger-print" size={14} color={Colors.primaryDark} />
              <Text style={styles.refText}>{agent?.agentReference || 'ARD-AGT-2026'}</Text>
            </View>
            <Badge label={agent?.accountStatus || 'ACTIVE'} variant="success" />
          </View>
        </View>

        {/* Section 1: Financial & Customers */}
        <Text style={styles.sectionHeading}>Business & Financials</Text>
        <View style={styles.menuCard}>
          <ProfileMenuItem
            icon="wallet-outline"
            title="Commission & Financial History"
            subtitle="Full breakdown of earnings & disbursements"
            onPress={() => router.push('/finance/commissions')}
          />
          <View style={styles.menuDivider} />
          <ProfileMenuItem
            icon="people-outline"
            title="Integrated Customers"
            subtitle="View active referral connections"
            onPress={() => router.push('/(tabs)/customers')}
          />
        </View>

        {/* Section 2: Account & Security */}
        <Text style={styles.sectionHeading}>Account & Security</Text>
        <View style={styles.menuCard}>
          <ProfileMenuItem
            icon="person-outline"
            title="Personal Information"
            subtitle="Registration details and assigned credentials"
            onPress={() => router.push('/profile/personal')}
          />
          <View style={styles.menuDivider} />
          <ProfileMenuItem
            icon="shield-checkmark-outline"
            title="Change Password"
            subtitle="Update your agent account security password"
            onPress={() => router.push('/profile/security')}
          />
          <View style={styles.menuDivider} />
          <ProfileMenuItem
            icon="key-outline"
            title="Remember Me & Saved Credentials"
            subtitle="Manage hardware-backed SecureStore login"
            onPress={() => router.push('/profile/remember-me')}
          />
          <View style={styles.menuDivider} />
          <ProfileMenuItem
            icon="notifications-outline"
            title="Notification Preferences"
            subtitle="Accepted order & commission alerts"
            onPress={() => router.push('/profile/notifications')}
          />
        </View>

        {/* Section 3: Legal & Support */}
        <Text style={styles.sectionHeading}>Support & About</Text>
        <View style={styles.menuCard}>
          <ProfileMenuItem
            icon="headset-outline"
            title="Contact Ardab Support"
            subtitle="Reach Super Admin agent operations desk"
            onPress={() => setSupportModalVisible(true)}
          />
          <View style={styles.menuDivider} />
          <ProfileMenuItem
            icon="document-text-outline"
            title="Privacy Policy"
            subtitle="Agent data protection & terms"
            onPress={() => setPrivacyModalVisible(true)}
          />
          <View style={styles.menuDivider} />
          <ProfileMenuItem
            icon="ribbon-outline"
            title="Terms of Service"
            subtitle="Verified Ardab Market Agent agreement"
            onPress={() => setTermsModalVisible(true)}
          />
          <View style={styles.menuDivider} />
          <ProfileMenuItem
            icon="information-circle-outline"
            title={`About ${APP_NAME}`}
            subtitle={APP_VERSION}
            onPress={() => router.push('/profile/about')}
          />
        </View>

        {/* Section 4: Sign Out */}
        <View style={[styles.menuCard, { marginTop: Spacing.lg }]}>
          <ProfileMenuItem
            icon="log-out-outline"
            title="Sign Out"
            subtitle="End your current agent session safely"
            onPress={() => setLogoutModalVisible(true)}
            isDestructive
          />
        </View>
      </ScrollView>

      {/* Support Modal */}
      <Modal
        visible={supportModalVisible}
        onClose={() => setSupportModalVisible(false)}
        title="Agent Support Desk"
      >
        <View style={styles.modalContent}>
          <Ionicons name="headset" size={44} color={Colors.primary} />
          <Text style={styles.modalTitle}>Ardab Market Super Admin Support</Text>
          <Text style={styles.modalDesc}>
            For commission inquiries, customer integration approvals, or technical assistance, contact the central operations desk:
          </Text>
          <View style={styles.contactCard}>
            <Text style={styles.contactRow}>• Email: agent.support@ardabmarket.com</Text>
            <Text style={styles.contactRow}>• Phone: +251 91 100 2233 / +251 92 200 3344</Text>
            <Text style={styles.contactRow}>• Hub: Gondar Central Warehouse & Addis Ababa Headquarters</Text>
          </View>
          <AppButton
            title="Close"
            variant="outline"
            onPress={() => setSupportModalVisible(false)}
            style={{ width: '100%', marginTop: Spacing.md }}
          />
        </View>
      </Modal>

      {/* Privacy Modal */}
      <Modal
        visible={privacyModalVisible}
        onClose={() => setPrivacyModalVisible(false)}
        title="Agent Privacy Policy"
      >
        <ScrollView style={{ maxHeight: 300 }}>
          <Text style={styles.legalBody}>
            Ardab Market protects all agent financial and personal information. All customer order attributions and commission balances are computed authoritatively on the central Ardab Market server and are kept confidential.
            {'\n\n'}
            Agents are prohibited from sharing customer contact details outside legitimate delivery and support assistance authorized by Ardab Market platform regulations.
          </Text>
        </ScrollView>
        <AppButton
          title="Understood"
          variant="primary"
          onPress={() => setPrivacyModalVisible(false)}
          style={{ width: '100%', marginTop: Spacing.md }}
        />
      </Modal>

      {/* Terms Modal */}
      <Modal
        visible={termsModalVisible}
        onClose={() => setTermsModalVisible(false)}
        title="Agent Agreement Terms"
      >
        <ScrollView style={{ maxHeight: 300 }}>
          <Text style={styles.legalBody}>
            1. Agents are legally verified representatives approved by the Ardab Market Super Admin.
            {'\n\n'}
            2. Customer integrations require Super Admin confirmation before becoming active.
            {'\n\n'}
            3. Commission is accrued only on accepted, non-refunded orders belonging to active integrated customers.
            {'\n\n'}
            4. Commission rates are configured exclusively by Super Admin and cannot be modified by the agent application.
          </Text>
        </ScrollView>
        <AppButton
          title="Understood"
          variant="primary"
          onPress={() => setTermsModalVisible(false)}
          style={{ width: '100%', marginTop: Spacing.md }}
        />
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={logoutModalVisible}
        onClose={() => setLogoutModalVisible(false)}
        title="Confirm Sign Out"
      >
        <View style={styles.modalContent}>
          <Ionicons name="log-out-outline" size={44} color={Colors.danger} />
          <Text style={styles.modalTitle}>Sign out of Agent Portal?</Text>
          <Text style={styles.modalDesc}>
            Are you sure you want to sign out? If Remember Me is enabled, your email will remain saved on this device.
          </Text>
          <View style={styles.modalActionRow}>
            <AppButton
              title="Cancel"
              variant="outline"
              size="md"
              onPress={() => setLogoutModalVisible(false)}
              style={{ flex: 1 }}
            />
            <AppButton
              title="Sign Out"
              variant="danger"
              size="md"
              onPress={handleLogout}
              style={{ flex: 1 }}
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
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
  },
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
    marginBottom: Spacing.lg,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryLight,
    borderWidth: 2,
    borderColor: Colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatarText: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  name: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  email: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  phone: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  refBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  refText: {
    fontSize: Typography.fontSize.tiny,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
  },
  sectionHeading: {
    fontSize: Typography.fontSize.xs + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing.xs + 2,
    marginTop: Spacing.md,
  },
  menuCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.round,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuTextWrapper: {
    flex: 1,
  },
  menuTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  menuSubtitle: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: Spacing.lg + 36,
  },
  modalContent: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  modalTitle: {
    fontSize: Typography.fontSize.md + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  contactCard: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginVertical: Spacing.md,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  contactRow: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text,
    lineHeight: 20,
  },
  legalBody: {
    fontSize: Typography.fontSize.xs + 1,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    width: '100%',
  },
});

