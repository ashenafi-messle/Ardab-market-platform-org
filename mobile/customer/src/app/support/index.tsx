import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { AppHeader, AppButton } from '@/components/common';
import { t } from '@/localization';
import { supportApi, MobileSupportTicket } from '@/services/supportApi';
import { useAuth } from '@/context/AuthContext';

export default function SupportHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [tickets, setTickets] = useState<MobileSupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // New Ticket Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [recentOrders, setRecentOrders] = useState<Array<{ id: string; orderNumber: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const data = await supportApi.getTickets();
      setTickets(data);
    } catch (err) {
      console.warn('[Support] Failed to fetch tickets:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const openNewTicketModal = async () => {
    setSubject('');
    setMessage('');
    setSelectedOrder('');
    setSubmitError(null);
    setModalVisible(true);
    try {
      const orders = await supportApi.getCustomerOrders();
      setRecentOrders(orders);
    } catch {
      // Ignore if orders couldn't be loaded
    }
  };

  const handleCreateTicket = async () => {
    if (!subject.trim()) {
      setSubmitError('Please enter a subject for your request.');
      return;
    }
    if (!message.trim()) {
      setSubmitError('Please provide details in the message field.');
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const res = await supportApi.createTicket({
        subject: subject.trim(),
        message: message.trim(),
        orderId: selectedOrder || undefined,
      });

      setModalVisible(false);
      setSubject('');
      setMessage('');
      setSelectedOrder('');
      setSubmitSuccess(res.message || `Support request #${res.ticketNumber} created successfully.`);
      fetchTickets();

      setTimeout(() => setSubmitSuccess(null), 6000);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit support request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { bg: '#EFF6FF', text: '#2563EB' };
      case 'IN_PROGRESS':
        return { bg: '#FEF3C7', text: '#D97706' };
      case 'RESOLVED':
        return { bg: '#ECFDF5', text: '#059669' };
      case 'CLOSED':
        return { bg: '#F3F4F6', text: '#6B7280' };
      default:
        return { bg: Colors.primaryLight, text: Colors.primaryDark };
    }
  };

  const faqs = [
    {
      q: 'How does delivery work in Gondar and Addis Ababa?',
      a: 'We use dedicated local courier agents. Once your order is verified by the producer union, it is packaged and delivered to your doorstep within 24-48 hours.',
    },
    {
      q: 'Can I pay with Telebirr or CBE Birr?',
      a: 'Yes! We support Telebirr, CBE Birr mobile transfers, direct bank deposits, as well as Cash on Delivery upon receiving your package.',
    },
    {
      q: 'Are the products guaranteed authentic?',
      a: 'Absolutely. Ardab Market works exclusively with verified Ethiopian agricultural unions, licensed cooperatives, and vetted craftsmen.',
    },
    {
      q: 'How do I return an item or request a refund?',
      a: 'If an item arrives damaged or differs from its description, you can report it within 48 hours directly via this support tab.',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('support.title') || 'Help & Support'} showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              fetchTickets();
            }}
            colors={[Colors.primary]}
          />
        }
      >
        {submitSuccess ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={styles.successBannerText}>{submitSuccess}</Text>
          </View>
        ) : null}

        {/* Contact Support Channels */}
        <Text style={styles.sectionTitle}>{t('support.contactSupport') || 'Contact Support'}</Text>
        <View style={styles.channelsGrid}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => Linking.openURL('tel:+251911000000').catch(() => {})}
            style={styles.channelCard}
          >
            <View style={styles.channelIconCircle}>
              <Ionicons name="call" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.channelName}>{t('support.callUs') || 'Call Desk'}</Text>
            <Text style={styles.channelDesc}>+251 91 100 0000</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => Linking.openURL('mailto:support@ardab.com').catch(() => {})}
            style={styles.channelCard}
          >
            <View style={styles.channelIconCircle}>
              <Ionicons name="mail" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.channelName}>{t('support.emailUs') || 'Email Support'}</Text>
            <Text style={styles.channelDesc}>support@ardab.com</Text>
          </TouchableOpacity>
        </View>

        {/* Support Tickets Section */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Your Support Requests</Text>
            <Text style={styles.sectionSubtitle}>Direct tickets handled by our support staff</Text>
          </View>
          <TouchableOpacity
            style={styles.newTicketBtn}
            onPress={openNewTicketModal}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color={Colors.background} />
            <Text style={styles.newTicketBtnText}>New Ticket</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading support tickets...</Text>
          </View>
        ) : tickets.length > 0 ? (
          tickets.map((ticket) => {
            const statusStyle = getStatusColor(ticket.status);
            return (
              <TouchableOpacity
                key={ticket.id}
                activeOpacity={0.85}
                onPress={() => router.push(`/support/${ticket.id}` as any)}
                style={styles.ticketCard}
              >
                <View style={styles.ticketHeader}>
                  <View style={styles.ticketIdRow}>
                    <Text style={styles.ticketNumber}>{ticket.ticketNumber}</Text>
                    {ticket.orderNumber ? (
                      <View style={styles.orderBadge}>
                        <Text style={styles.orderBadgeText}>Order: {ticket.orderNumber}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {ticket.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
                <Text style={styles.ticketSubject} numberOfLines={2}>
                  {ticket.subject}
                </Text>
                <View style={styles.ticketFooter}>
                  <Text style={styles.ticketCategory}>{ticket.category}</Text>
                  <Text style={styles.ticketTime}>
                    {new Date(ticket.lastMessageAt || ticket.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyTicketsCard}>
            <Ionicons name="chatbubbles-outline" size={36} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No support tickets yet</Text>
            <Text style={styles.emptyDesc}>
              Have questions about your order, delivery, or account? Open a ticket directly with our team.
            </Text>
            <AppButton
              title="Submit Support Request"
              variant="outline"
              size="sm"
              onPress={openNewTicketModal}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        )}

        {/* FAQs Accordion */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>
          {t('support.faq') || 'Frequently Asked Questions'}
        </Text>
        {faqs.map((faq, idx) => {
          const isExpanded = expandedFaq === idx;
          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.85}
              onPress={() => setExpandedFaq(isExpanded ? null : idx)}
              style={styles.faqCard}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.q}</Text>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Colors.primary}
                />
              </View>
              {isExpanded ? <Text style={styles.faqAnswer}>{faq.a}</Text> : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* New Ticket Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Support Request</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              {submitError ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color={Colors.error} />
                  <Text style={styles.errorBannerText}>{submitError}</Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Subject *</Text>
              <TextInput
                style={styles.textInput}
                value={subject}
                onChangeText={setSubject}
                placeholder="e.g. Question about delivery time"
                placeholderTextColor={Colors.textMuted}
              />

              {recentOrders.length > 0 ? (
                <>
                  <Text style={[styles.inputLabel, { marginTop: Spacing.sm }]}>Related Order (optional)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ordersScroll}>
                    <TouchableOpacity
                      style={[styles.orderChip, !selectedOrder && styles.orderChipActive]}
                      onPress={() => setSelectedOrder('')}
                    >
                      <Text style={[styles.orderChipText, !selectedOrder && styles.orderChipTextActive]}>
                        None
                      </Text>
                    </TouchableOpacity>
                    {recentOrders.map((ord) => (
                      <TouchableOpacity
                        key={ord.id}
                        style={[styles.orderChip, selectedOrder === ord.id && styles.orderChipActive]}
                        onPress={() => setSelectedOrder(ord.id)}
                      >
                        <Text style={[styles.orderChipText, selectedOrder === ord.id && styles.orderChipTextActive]}>
                          #{ord.orderNumber}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              ) : null}

              <Text style={[styles.inputLabel, { marginTop: Spacing.sm }]}>Message *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={message}
                onChangeText={setMessage}
                placeholder="Describe your issue or question in detail..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.ticketEmailNote}>
                An email notification with your ticket reference will automatically be sent to our support desk and your verified email.
              </Text>

              <View style={styles.modalActionRow}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  size="md"
                  onPress={() => setModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <AppButton
                  title={isSubmitting ? 'Sending...' : 'Send to Support'}
                  variant="primary"
                  size="md"
                  onPress={handleCreateTicket}
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  style={{ flex: 1.5 }}
                />
              </View>
            </ScrollView>
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
    paddingBottom: Spacing.huge,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  newTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  newTicketBtnText: {
    color: Colors.background,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  channelsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  channelCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  channelIconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  channelName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  channelDesc: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ticketCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ticketIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketNumber: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  orderBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  orderBadgeText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  statusText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
  },
  ticketSubject: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginVertical: 4,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  ticketCategory: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
  },
  ticketTime: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
  },
  loadingBox: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  emptyTicketsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: Spacing.xs,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  emptyDesc: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 260,
  },
  faqCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  faqAnswer: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.successLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  successBannerText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: Colors.success,
    fontWeight: Typography.fontWeight.medium,
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
    maxHeight: '90%',
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
    marginBottom: Spacing.xs,
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
    flex: 1,
  },
  inputLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    backgroundColor: Colors.card,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  ordersScroll: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  orderChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 6,
  },
  orderChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  orderChipText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  orderChipTextActive: {
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.bold,
  },
  ticketEmailNote: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
});
