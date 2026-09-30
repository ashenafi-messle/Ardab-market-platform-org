import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { AppHeader, AppInput, AppButton } from '@/components/common';
import { t } from '@/localization';
import { securityApi, ActiveSession } from '@/services/securityApi';
import { useAuth } from '@/context/AuthContext';
import { ARDAB_LICENSE_URL } from '@/constants/branding';

export default function SecurityScreen() {
  const { user } = useAuth();

  // License Modal State
  const [licenseModalVisible, setLicenseModalVisible] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordToast, setPasswordToast] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Sessions State
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingOthers, setRevokingOthers] = useState(false);

  // Privacy Info Modal State
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  // Deletion Request State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isSubmittingDeletion, setIsSubmittingDeletion] = useState(false);
  const [deletionSuccessMsg, setDeletionSuccessMsg] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const list = await securityApi.getSessions();
      setSessions(list);
    } catch (err) {
      console.warn('[Security] Failed to fetch sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordError(null);
    setIsUpdatingPassword(true);
    try {
      const res = await securityApi.changePassword(currentPassword, newPassword);
      setPasswordToast(res.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordToast(null), 4000);
      // Refresh sessions in case old ones were revoked
      fetchSessions();
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password. Please check your current password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleRevokeOtherSessions = () => {
    Alert.alert(
      'Sign Out Other Devices',
      'Are you sure you want to sign out all other devices and sessions?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out All',
          style: 'destructive',
          onPress: async () => {
            setRevokingOthers(true);
            try {
              await securityApi.revokeOtherSessions();
              fetchSessions();
              Alert.alert('Success', 'All other active sessions have been revoked.');
            } catch {
              Alert.alert('Error', 'Failed to sign out other devices.');
            } finally {
              setRevokingOthers(false);
            }
          },
        },
      ]
    );
  };

  const handleRevokeSingleSession = (session: ActiveSession) => {
    Alert.alert(
      'Sign Out Device',
      `Revoke session for ${session.deviceInfo}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await securityApi.revokeSession(session.id);
              fetchSessions();
            } catch {
              Alert.alert('Error', 'Failed to revoke session.');
            }
          },
        },
      ]
    );
  };

  const handleSubmitAccountDeletion = async () => {
    setIsSubmittingDeletion(true);
    try {
      const res = await securityApi.requestAccountDeletion(deleteReason || 'Customer requested from mobile app');
      setDeleteModalVisible(false);
      setDeleteReason('');
      setDeletionSuccessMsg(res.message);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit account deletion request.');
    } finally {
      setIsSubmittingDeletion(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('profile.security') || 'Security & Privacy'} showBack />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Verification & Protection Status */}
        <View style={styles.verifiedCard}>
          <View style={styles.verifiedIcon}>
            <Ionicons name="shield-checkmark" size={28} color={Colors.primary} />
          </View>
          <View style={styles.verifiedInfo}>
            <Text style={styles.verifiedTitle}>End-to-End Account Protection</Text>
            <Text style={styles.verifiedDesc}>
              Your account, transactions, and addresses are encrypted and protected with industry-standard protocols.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setLicenseModalVisible(true)}
              style={styles.licenseLinkBtn}
            >
              <Ionicons name="document-text-outline" size={14} color={Colors.primary} />
              <Text style={styles.licenseLinkText}>View Official Platform License</Text>
            </TouchableOpacity>
          </View>
        </View>

        {deletionSuccessMsg ? (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={20} color={Colors.primary} />
            <Text style={styles.infoBannerText}>{deletionSuccessMsg}</Text>
          </View>
        ) : null}

        {/* Change Password Form */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="key-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>{t('profile.changePassword') || 'Change Password'}</Text>
          </View>

          {passwordError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorBannerText}>{passwordError}</Text>
            </View>
          ) : null}

          {passwordToast ? (
            <View style={styles.successToast}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.successToastText}>{passwordToast}</Text>
            </View>
          ) : null}

          <AppInput
            label="Current Password"
            value={currentPassword}
            onChangeText={(v) => {
              setCurrentPassword(v);
              if (passwordError) setPasswordError(null);
            }}
            isPassword
            placeholder="Enter current password"
          />

          <AppInput
            label="New Password"
            value={newPassword}
            onChangeText={(v) => {
              setNewPassword(v);
              if (passwordError) setPasswordError(null);
            }}
            isPassword
            placeholder="Enter new password (min. 6 characters)"
            helperText="At least 6 characters"
          />

          <AppInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              if (passwordError) setPasswordError(null);
            }}
            isPassword
            placeholder="Re-type new password"
          />

          <AppButton
            title={isUpdatingPassword ? 'Updating...' : (t('common.save') || 'Update Password')}
            variant="primary"
            size="md"
            onPress={handleUpdatePassword}
            disabled={isUpdatingPassword || !currentPassword || newPassword.length < 6}
            loading={isUpdatingPassword}
            style={{ marginTop: Spacing.sm }}
          />
        </View>

        {/* Active Sessions */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="hardware-chip-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Active Devices & Sessions</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Devices currently logged into your Ardab Market account.
          </Text>

          {loadingSessions ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Checking active devices...</Text>
            </View>
          ) : sessions.length > 0 ? (
            <View style={styles.sessionList}>
              {sessions.map((sess) => (
                <View key={sess.id} style={styles.sessionItem}>
                  <View style={styles.sessionLeft}>
                    <Ionicons
                      name={sess.deviceInfo.toLowerCase().includes('phone') || sess.deviceInfo.toLowerCase().includes('android') || sess.deviceInfo.toLowerCase().includes('ios') ? 'phone-portrait-outline' : 'laptop-outline'}
                      size={20}
                      color={sess.isCurrent ? Colors.primary : Colors.textMuted}
                    />
                    <View style={styles.sessionDetails}>
                      <View style={styles.sessionTitleRow}>
                        <Text style={styles.sessionDevice}>{sess.deviceInfo || 'Authorized Device'}</Text>
                        {sess.isCurrent && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>This Device</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.sessionTime}>
                        Active: {sess.lastActive ? new Date(sess.lastActive).toLocaleDateString() : 'Recently'}
                      </Text>
                    </View>
                  </View>
                  {!sess.isCurrent && (
                    <TouchableOpacity
                      onPress={() => handleRevokeSingleSession(sess)}
                      style={styles.revokeButton}
                    >
                      <Text style={styles.revokeButtonText}>Sign Out</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {sessions.filter((s) => !s.isCurrent).length > 0 && (
                <AppButton
                  title={revokingOthers ? 'Signing out...' : 'Sign Out Other Devices'}
                  variant="outline"
                  size="sm"
                  onPress={handleRevokeOtherSessions}
                  disabled={revokingOthers}
                  style={{ marginTop: Spacing.md }}
                />
              )}
            </View>
          ) : (
            <View style={styles.currentSessionOnly}>
              <Ionicons name="phone-portrait-outline" size={20} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionDevice}>Current Mobile Device</Text>
                <Text style={styles.sessionTime}>Secure authenticated session active</Text>
              </View>
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Active</Text>
              </View>
            </View>
          )}
        </View>

        {/* Privacy Information */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Privacy & Data Protection</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Learn what account information is stored and how Ardab Market protects your privacy.
          </Text>

          <TouchableOpacity
            style={styles.privacyLinkRow}
            onPress={() => setPrivacyModalVisible(true)}
          >
            <View style={styles.privacyLinkLeft}>
              <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.privacyLinkText}>View Privacy Information & Rights</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Account Deletion Request */}
        <View style={[styles.sectionCard, { borderColor: '#FEE2E2' }]}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
            <Text style={[styles.sectionTitle, { color: Colors.error }]}>Delete Account</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Request account deletion. Personal identifying information will be anonymized while preserving required order receipts.
          </Text>

          <AppButton
            title="Request Account Deletion"
            variant="outline"
            size="sm"
            onPress={() => setDeleteModalVisible(true)}
            style={{ borderColor: Colors.error, marginTop: Spacing.sm }}
            textStyle={{ color: Colors.error }}
          />
        </View>
      </ScrollView>

      {/* Privacy Information Modal */}
      <Modal visible={privacyModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Privacy Information</Text>
              <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.privacyHeading}>What Information We Collect</Text>
              <Text style={styles.privacyParagraph}>
                • Account Credentials: Your name, email, phone number, and hashed passwords. Plain passwords are never stored or logged.{'\n'}
                • Delivery Details: Saved addresses, delivery zones, and contact phone numbers for fulfillments.{'\n'}
                • Orders & Transactions: Item codes, purchase histories, and payment receipts.{'\n'}
                • Communications: Support tickets and order status messages.
              </Text>

              <Text style={styles.privacyHeading}>How Your Data is Used</Text>
              <Text style={styles.privacyParagraph}>
                • Processing and delivering your marketplace orders.{'\n'}
                • Sending transactional updates and security notifications.{'\n'}
                • Providing customer support and resolving delivery queries.{'\n'}
                • Preventing fraudulent transactions and unauthorized account access.
              </Text>

              <Text style={styles.privacyHeading}>Security & Retention</Text>
              <Text style={styles.privacyParagraph}>
                Your data is transmitted over TLS encryption and stored in secure cloud infrastructure. In accordance with legal obligations, financial records of completed orders are retained for accounting purposes even upon account closure.
              </Text>
            </ScrollView>
            <AppButton
              title="Close"
              variant="primary"
              size="md"
              onPress={() => setPrivacyModalVisible(false)}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        </View>
      </Modal>

      {/* Account Deletion Request Modal */}
      <Modal visible={deleteModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: Colors.error }]}>Request Account Deletion</Text>
              <TouchableOpacity onPress={() => setDeleteModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.deletionWarning}>
              Are you sure you want to request deletion of your account? This action cannot be reversed once finalized. Active orders will be completed before closure.
            </Text>
            <Text style={styles.inputLabel}>Reason for leaving (optional):</Text>
            <TextInput
              style={styles.reasonInput}
              value={deleteReason}
              onChangeText={setDeleteReason}
              placeholder="Tell us how we can improve..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActionRow}>
              <AppButton
                title="Cancel"
                variant="outline"
                size="md"
                onPress={() => setDeleteModalVisible(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                title={isSubmittingDeletion ? 'Submitting...' : 'Submit Request'}
                variant="primary"
                size="md"
                onPress={handleSubmitAccountDeletion}
                disabled={isSubmittingDeletion}
                loading={isSubmittingDeletion}
                style={{ flex: 1, backgroundColor: Colors.error, borderColor: Colors.error }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Official Business License Modal */}
      <Modal visible={licenseModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.licenseModalTitleRow}>
                <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
                <Text style={styles.modalTitle}>Official Business License</Text>
              </View>
              <TouchableOpacity onPress={() => setLicenseModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.licenseImageWrapper}>
                <Image
                  source={{ uri: ARDAB_LICENSE_URL }}
                  style={styles.licenseImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.licenseNoteText}>
                Ardab Market operates with authorized Ethiopian Commercial Registration and government licensing. Verified for digital transactions.
              </Text>
            </ScrollView>
            <AppButton
              title="Close"
              variant="primary"
              size="md"
              onPress={() => setLicenseModalVisible(false)}
              style={{ marginTop: Spacing.sm }}
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
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.huge,
  },
  verifiedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  verifiedIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedInfo: {
    flex: 1,
  },
  verifiedTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  verifiedDesc: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  infoBannerText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: '#1E40AF',
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDE8E8',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
  },
  errorBannerText: {
    color: Colors.error,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    flex: 1,
  },
  successToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successLight,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
  },
  successToastText: {
    color: Colors.success,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  sessionList: {
    marginTop: Spacing.xs,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  sessionDetails: {
    flex: 1,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionDevice: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text,
  },
  sessionTime: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
    marginTop: 2,
  },
  currentBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.xs,
  },
  currentBadgeText: {
    fontSize: 9,
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.bold,
  },
  revokeButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.xs,
    backgroundColor: '#FDE8E8',
  },
  revokeButtonText: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.error,
    fontWeight: Typography.fontWeight.medium,
  },
  currentSessionOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  privacyLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  privacyLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privacyLinkText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
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
  modalBody: {
    marginBottom: Spacing.md,
  },
  privacyHeading: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  privacyParagraph: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  deletionWarning: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text,
    marginBottom: 4,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    color: Colors.text,
    fontSize: Typography.fontSize.sm,
    height: 80,
    textAlignVertical: 'top',
    marginBottom: Spacing.md,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  licenseLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: '#D1E7DD',
  },
  licenseLinkText: {
    fontSize: 11,
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.bold,
  },
  licenseModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  licenseImageWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  licenseImage: {
    width: '100%',
    height: 320,
    borderRadius: Radius.md,
  },
  licenseNoteText: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
