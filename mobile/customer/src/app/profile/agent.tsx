// ==============================================================================
// Ardab Market - Mobile Customer My Agent Screen
// ==============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/theme';
import { AppHeader, AppInput, AppButton } from '@/components/common';
import { t } from '@/localization';
import { agentApi, CustomerAgentStateResponse } from '@/services/agentApi';

export default function MyAgentScreen() {
  const router = useRouter();

  const [agentState, setAgentState] = useState<CustomerAgentStateResponse>({
    status: 'NONE',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form input state
  const [emailInput, setEmailInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUnknownAgent, setIsUnknownAgent] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  // Load Integration State from server
  const loadState = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const res = await agentApi.getIntegrationState();
      setAgentState(res);
      setErrorMessage(null);
      setIsUnknownAgent(false);
    } catch (err: any) {
      console.warn('[MyAgentScreen] Failed to load integration state:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadState(false);
  };

  // Submit Integration Request
  const handleSubmit = async () => {
    const trimmed = emailInput.trim();
    if (!trimmed) {
      setErrorMessage(t('agent.emailHelper') || 'Please enter the agent email address.');
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setIsUnknownAgent(false);

      const res = await agentApi.submitIntegrationRequest(trimmed);

      if (res.ok && res.data) {
        setAgentState(res.data);
        setEmailInput('');
        setSuccessToast(true);
      } else {
        if (res.isUnknownAgent) {
          setIsUnknownAgent(true);
          setErrorMessage(
            t('agent.unknownAgent') ||
              'Unknown agent. Please check the email address and try again.'
          );
        } else {
          setErrorMessage(res.error || 'Failed to submit integration request.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Switch from Rejected state to retry new email
  const handleTryAnother = () => {
    setAgentState({ status: 'NONE' });
    setEmailInput('');
    setErrorMessage(null);
    setIsUnknownAgent(false);
  };

  const isConnected = agentState.status === 'APPROVED' && agentState.agent;
  const isPending = agentState.status === 'PENDING';
  const isRejected = agentState.status === 'REJECTED';
  const isAgentInactive = isConnected && agentState.agent?.status === 'INACTIVE';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <AppHeader
        title={t('agent.title') || 'My Agent'}
        showBack
        onBackPress={() => router.back()}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>{t('common.loading') || 'Loading...'}</Text>
            </View>
          ) : (
            <>
              {/* ============================================================= */}
              {/* STATE D & F: APPROVED INTEGRATION (CONNECTED OR INACTIVE)     */}
              {/* ============================================================= */}
              {isConnected && (
                <View style={styles.cardContainer}>
                  {/* Status Badge Banner */}
                  <View
                    style={[
                      styles.statusHeader,
                      isAgentInactive ? styles.statusHeaderInactive : styles.statusHeaderConnected,
                    ]}
                  >
                    <Ionicons
                      name={isAgentInactive ? 'alert-circle' : 'checkmark-circle'}
                      size={20}
                      color={isAgentInactive ? '#856404' : '#155724'}
                    />
                    <Text
                      style={[
                        styles.statusHeaderText,
                        isAgentInactive ? styles.statusTextInactive : styles.statusTextConnected,
                      ]}
                    >
                      {isAgentInactive
                        ? t('agent.statusInactive') || 'Agent Inactive'
                        : t('agent.statusConnected') || 'Connected Agent'}
                    </Text>
                  </View>

                  <View style={styles.cardBody}>
                    {/* Agent Avatar & Name */}
                    <View style={styles.agentInfoRow}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarLetter}>
                          {agentState.agent?.name?.charAt(0).toUpperCase() || 'A'}
                        </Text>
                      </View>
                      <View style={styles.agentNameBox}>
                        <View style={styles.verifiedRow}>
                          <Text style={styles.agentNameText}>{agentState.agent?.name}</Text>
                          <Ionicons name="shield-checkmark" size={16} color={Colors.primary} />
                        </View>
                        <Text style={styles.agentSubText}>
                          {t('common.appName')} Official Referral Partner
                        </Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Contact Details */}
                    <View style={styles.detailItem}>
                      <View style={styles.detailIconBox}>
                        <Ionicons name="mail-outline" size={18} color={Colors.primary} />
                      </View>
                      <View style={styles.detailTextBox}>
                        <Text style={styles.detailLabel}>Registered Email</Text>
                        <Text style={styles.detailValue}>{agentState.agent?.email}</Text>
                      </View>
                    </View>

                    <View style={styles.detailItem}>
                      <View style={styles.detailIconBox}>
                        <Ionicons name="call-outline" size={18} color={Colors.primary} />
                      </View>
                      <View style={styles.detailTextBox}>
                        <Text style={styles.detailLabel}>Phone Number</Text>
                        <Text style={styles.detailValue}>{agentState.agent?.phone}</Text>
                      </View>
                    </View>

                    {agentState.agent?.connectedAt && (
                      <View style={styles.detailItem}>
                        <View style={styles.detailIconBox}>
                          <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} />
                        </View>
                        <View style={styles.detailTextBox}>
                          <Text style={styles.detailLabel}>{t('agent.connectedSince') || 'Connected since'}</Text>
                          <Text style={styles.detailValue}>
                            {new Date(agentState.agent.connectedAt).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Action Buttons: Tap to Call & Email */}
                    <View style={styles.actionButtonsRow}>
                      {agentState.agent?.phone && (
                        <TouchableOpacity
                          style={[styles.contactButton, styles.callButton]}
                          onPress={() => Linking.openURL(`tel:${agentState.agent?.phone}`)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="call" size={16} color="#FFFFFF" />
                          <Text style={styles.contactButtonText}>{t('agent.callAgent') || 'Call Agent'}</Text>
                        </TouchableOpacity>
                      )}

                      {agentState.agent?.email && (
                        <TouchableOpacity
                          style={[styles.contactButton, styles.emailButton]}
                          onPress={() => Linking.openURL(`mailto:${agentState.agent?.email}`)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="mail" size={16} color={Colors.primary} />
                          <Text style={[styles.contactButtonText, { color: Colors.primary }]}>
                            {t('agent.emailAgent') || 'Email'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Assurance note */}
                    <View style={styles.assuranceBox}>
                      <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} />
                      <Text style={styles.assuranceText}>
                        Your future eligible orders placed on Ardab Market will receive priority support and referral attribution with this agent.
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* ============================================================= */}
              {/* STATE C: PENDING CONFIRMATION                                 */}
              {/* ============================================================= */}
              {isPending && (
                <View style={styles.cardContainer}>
                  <View style={[styles.statusHeader, styles.statusHeaderPending]}>
                    <Ionicons name="time-outline" size={20} color="#856404" />
                    <Text style={[styles.statusHeaderText, styles.statusTextPending]}>
                      {t('agent.statusPending') || 'Pending Confirmation'}
                    </Text>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.pendingHeroBox}>
                      <View style={styles.pendingIconBubble}>
                        <Ionicons name="hourglass-outline" size={36} color="#856404" />
                      </View>
                      <Text style={styles.pendingTitle}>
                        {t('agent.pendingNotice') ||
                          'Your agent integration request is awaiting admin confirmation.'}
                      </Text>
                      <Text style={styles.pendingDesc}>
                        {t('agent.pendingDesc') ||
                          'Your request has been submitted to the Super Admin team for verification. The connection will become active once verified.'}
                      </Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.detailItem}>
                      <View style={styles.detailIconBox}>
                        <Ionicons name="person-outline" size={18} color={Colors.primary} />
                      </View>
                      <View style={styles.detailTextBox}>
                        <Text style={styles.detailLabel}>Requested Agent</Text>
                        <Text style={styles.detailValue}>
                          {agentState.agentName || 'Ardab Market Agent'}
                        </Text>
                      </View>
                    </View>

                    {agentState.requestDate && (
                      <View style={styles.detailItem}>
                        <View style={styles.detailIconBox}>
                          <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} />
                        </View>
                        <View style={styles.detailTextBox}>
                          <Text style={styles.detailLabel}>{t('agent.requestDate') || 'Requested on'}</Text>
                          <Text style={styles.detailValue}>
                            {new Date(agentState.requestDate).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </Text>
                        </View>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.refreshButton}
                      onPress={() => loadState(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="refresh" size={16} color={Colors.primary} />
                      <Text style={styles.refreshButtonText}>
                        {t('agent.refreshStatus') || 'Refresh Status'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ============================================================= */}
              {/* STATE E: REJECTED INTEGRATION                                */}
              {/* ============================================================= */}
              {isRejected && (
                <View style={styles.cardContainer}>
                  <View style={[styles.statusHeader, styles.statusHeaderRejected]}>
                    <Ionicons name="close-circle" size={20} color="#721c24" />
                    <Text style={[styles.statusHeaderText, styles.statusTextRejected]}>
                      {t('agent.statusRejected') || 'Request Rejected'}
                    </Text>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.rejectedHeroBox}>
                      <Text style={styles.rejectedTitle}>
                        {t('agent.rejectedNotice') || 'Your integration request could not be approved.'}
                      </Text>
                      {agentState.rejectionReason && (
                        <View style={styles.rejectionReasonBox}>
                          <Text style={styles.rejectionReasonLabel}>
                            {t('agent.rejectionReason') || 'Reason provided'}:
                          </Text>
                          <Text style={styles.rejectionReasonText}>{agentState.rejectionReason}</Text>
                        </View>
                      )}
                    </View>

                    <AppButton
                      title={t('agent.tryAnotherAgent') || 'Connect with Another Agent'}
                      onPress={handleTryAnother}
                      variant="primary"
                      style={styles.retryButton}
                    />
                  </View>
                </View>
              )}

              {/* ============================================================= */}
              {/* STATE A & B: NO INTEGRATION / UNKNOWN AGENT FORM              */}
              {/* ============================================================= */}
              {agentState.status === 'NONE' && (
                <View style={styles.formCard}>
                  {/* Hero Header */}
                  <View style={styles.heroHeader}>
                    <View style={styles.heroIconBubble}>
                      <Ionicons name="people" size={32} color={Colors.primary} />
                    </View>
                    <Text style={styles.heroTitle}>{t('agent.title') || 'My Agent'}</Text>
                    <Text style={styles.heroSubtitle}>
                      {t('agent.subtitle') ||
                        'Connect your account with a verified Ardab Market agent for dedicated support, personalized assistance, and community referral benefits.'}
                    </Text>
                  </View>

                  {/* Toast on success */}
                  {successToast && (
                    <View style={styles.successBanner}>
                      <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                      <Text style={styles.successBannerText}>
                        {t('agent.pendingNotice') || 'Integration request submitted successfully!'}
                      </Text>
                    </View>
                  )}

                  {/* Error / Unknown Agent Banner (State B) */}
                  {errorMessage && (
                    <View
                      style={[
                        styles.errorBanner,
                        isUnknownAgent ? styles.unknownAgentBanner : null,
                      ]}
                    >
                      <Ionicons
                        name={isUnknownAgent ? 'alert-circle' : 'close-circle'}
                        size={20}
                        color={isUnknownAgent ? '#b71c1c' : '#721c24'}
                      />
                      <View style={styles.errorTextContainer}>
                        <Text
                          style={[
                            styles.errorBannerText,
                            isUnknownAgent ? styles.unknownAgentText : null,
                          ]}
                        >
                          {errorMessage}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Email Input */}
                  <View style={styles.inputContainer}>
                    <AppInput
                      label={t('agent.emailLabel') || 'Agent Registered Email'}
                      value={emailInput}
                      onChangeText={(val) => {
                        setEmailInput(val);
                        if (errorMessage) {
                          setErrorMessage(null);
                          setIsUnknownAgent(false);
                        }
                      }}
                      placeholder={t('agent.emailPlaceholder') || 'e.g. agent@ardabmarket.com'}
                      leftIcon={<Ionicons name="mail-outline" size={18} color={Colors.primary} />}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
                    />
                    <Text style={styles.inputHelperText}>
                      {t('agent.emailHelper') ||
                        'Enter the registered email address provided by your Ardab Market agent. Your connection will become active after admin approval.'}
                    </Text>
                  </View>

                  {/* Submit Button */}
                  <AppButton
                    title={
                      isSubmitting
                        ? t('agent.connecting') || 'Connecting...'
                        : t('agent.connectButton') || 'Connect with Agent'
                    }
                    onPress={handleSubmit}
                    loading={isSubmitting}
                    disabled={isSubmitting || !emailInput.trim()}
                    variant="primary"
                    style={styles.submitButton}
                  />

                  {/* Slogan Branding */}
                  <View style={styles.brandingFooter}>
                    <Text style={styles.sloganText}>“Quality and Trust, Delivered to Your Door!”</Text>
                    <Text style={styles.poweredByText}>Ardab Market — powered by Ardab Tech Solutions S.C.</Text>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl * 2,
  },
  loadingContainer: {
    paddingVertical: Spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.base,
    color: Colors.textMuted,
  },

  // Generic Card Container
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardBody: {
    padding: Spacing.md,
  },

  // Status Header Banners
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.xs + 2,
  },
  statusHeaderConnected: {
    backgroundColor: '#D4EDDA',
    borderBottomWidth: 1,
    borderBottomColor: '#C3E6CB',
  },
  statusHeaderInactive: {
    backgroundColor: '#FFF3CD',
    borderBottomWidth: 1,
    borderBottomColor: '#FFEEBA',
  },
  statusHeaderPending: {
    backgroundColor: '#FFF3CD',
    borderBottomWidth: 1,
    borderBottomColor: '#FFEEBA',
  },
  statusHeaderRejected: {
    backgroundColor: '#F8D7DA',
    borderBottomWidth: 1,
    borderBottomColor: '#F5C6CB',
  },
  statusHeaderText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTextConnected: {
    color: '#155724',
  },
  statusTextInactive: {
    color: '#856404',
  },
  statusTextPending: {
    color: '#856404',
  },
  statusTextRejected: {
    color: '#721c24',
  },

  // Agent Info Row
  agentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  agentNameBox: {
    flex: 1,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  agentNameText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.text,
  },
  agentSubText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: '#E9ECEF',
    marginVertical: Spacing.md,
  },

  // Detail List Items
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  detailIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: '#F1F3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextBox: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.text,
  },

  // Contact Action Buttons
  actionButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  callButton: {
    backgroundColor: Colors.primary,
  },
  emailButton: {
    backgroundColor: '#E7F1FF',
    borderWidth: 1,
    borderColor: '#B8DAFF',
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.sm,
    fontWeight: 'bold',
  },

  assuranceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  assuranceText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },

  // Pending State Box
  pendingHeroBox: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  pendingIconBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF3CD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  pendingTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: 'bold',
    color: '#856404',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  pendingDesc: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.sm,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  refreshButtonText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: Typography.fontSize.sm,
  },

  // Rejected State Box
  rejectedHeroBox: {
    paddingVertical: Spacing.sm,
  },
  rejectedTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: 'bold',
    color: '#721c24',
    marginBottom: Spacing.sm,
  },
  rejectionReasonBox: {
    backgroundColor: '#F8F9FA',
    borderLeftWidth: 3,
    borderLeftColor: '#DC3545',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  rejectionReasonLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  rejectionReasonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
  },
  retryButton: {
    marginTop: Spacing.md,
  },

  // Form Card (State A & B)
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  heroHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  heroIconBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E7F1FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },

  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4EDDA',
    borderWidth: 1,
    borderColor: '#C3E6CB',
    padding: Spacing.sm + 2,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs + 2,
  },
  successBannerText: {
    flex: 1,
    color: '#155724',
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8D7DA',
    borderWidth: 1,
    borderColor: '#F5C6CB',
    padding: Spacing.sm + 2,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs + 2,
  },
  unknownAgentBanner: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
    borderWidth: 1.5,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorBannerText: {
    color: '#721c24',
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    lineHeight: 18,
  },
  unknownAgentText: {
    color: '#B71C1C',
    fontWeight: 'bold',
  },

  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputHelperText: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    marginTop: 4,
  },

  submitButton: {
    marginTop: Spacing.xs,
  },

  brandingFooter: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
  },
  sloganText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  poweredByText: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
