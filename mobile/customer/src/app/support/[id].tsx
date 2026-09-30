import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { AppHeader } from '@/components/common';
import { t } from '@/localization';
import { supportApi, MobileSupportTicketDetail } from '@/services/supportApi';

export default function TicketConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ticket, setTicket] = useState<MobileSupportTicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const fetchTicketDetails = useCallback(async () => {
    if (!id) return;
    try {
      const data = await supportApi.getTicketDetails(id);
      if (data) {
        setTicket(data);
      }
    } catch (err) {
      console.warn('[TicketConversation] Error fetching ticket:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTicketDetails();
  }, [fetchTicketDetails]);

  useEffect(() => {
    // Scroll to bottom when messages update
    if (ticket?.messages?.length) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [ticket?.messages?.length]);

  const handleSend = async () => {
    const textToSend = inputText.trim();
    if (!textToSend || !id || isSending) return;

    setInputText('');
    setIsSending(true);

    // Optimistically add message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      body: textToSend,
      senderType: 'CUSTOMER' as const,
      isSelf: true,
      senderName: 'You',
      createdAt: new Date().toISOString(),
    };

    setTicket((prev) =>
      prev
        ? {
            ...prev,
            messages: [...prev.messages, optimisticMsg],
          }
        : prev
    );

    try {
      await supportApi.replyTicket(id, textToSend);
      // Re-fetch to get server-confirmed state and IDs
      await fetchTicketDetails();
    } catch (err: any) {
      // Rollback optimistic message on failure
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.filter((m) => m.id !== tempId),
            }
          : prev
      );
      setInputText(textToSend);
      Alert.alert('Send Failed', err.message || 'Could not deliver your reply. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const getStatusColor = (status?: string) => {
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

  const statusStyle = getStatusColor(ticket?.status);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <AppHeader
        title={ticket ? `#${ticket.ticketNumber}` : (t('support.title') || 'Support Ticket')}
        showBack
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      ) : ticket ? (
        <>
          {/* Ticket Subject & Order Card */}
          <View style={styles.subjectCard}>
            <View style={styles.subjectTop}>
              <View style={styles.categoryRow}>
                <Text style={styles.ticketCategory}>{ticket.category}</Text>
                {ticket.orderNumber ? (
                  <View style={styles.orderBadge}>
                    <Ionicons name="receipt-outline" size={10} color={Colors.textMuted} />
                    <Text style={styles.orderBadgeText}>Order #{ticket.orderNumber}</Text>
                  </View>
                ) : null}
              </View>
              <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.statusText, { color: statusStyle.text }]}>
                  {ticket.status.replace('_', ' ')}
                </Text>
              </View>
            </View>
            <Text style={styles.ticketSubject}>{ticket.subject}</Text>
            <Text style={styles.openedDate}>
              Opened on {new Date(ticket.createdAt).toLocaleDateString()}
            </Text>
          </View>

          {/* Conversation Messages */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardContainer}
          >
            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.messagesScroll}
            >
              {ticket.messages.length === 0 ? (
                <View style={styles.emptyMessages}>
                  <Text style={styles.emptyMessagesText}>No messages in this ticket yet.</Text>
                </View>
              ) : (
                ticket.messages.map((m) => {
                  const isUser = m.isSelf || m.senderType === 'CUSTOMER';
                  return (
                    <View
                      key={m.id}
                      style={[styles.messageBubble, isUser ? styles.bubbleUser : styles.bubbleSupport]}
                    >
                      {!isUser && (
                        <Text style={styles.senderHeader}>{m.senderName || 'Ardab Support'}</Text>
                      )}
                      <Text style={[styles.messageText, isUser ? styles.textUser : styles.textSupport]}>
                        {m.body}
                      </Text>
                      <Text style={[styles.timeText, isUser ? styles.timeUser : styles.timeSupport]}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Input Bar */}
            {ticket.status === 'CLOSED' ? (
              <View style={styles.closedNotice}>
                <Ionicons name="lock-closed-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.closedNoticeText}>This ticket is closed. Open a new ticket if you need further help.</Text>
              </View>
            ) : (
              <View style={styles.inputBar}>
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={t('support.messagePlaceholder') || 'Type your message...'}
                  placeholderTextColor={Colors.textMuted}
                  style={styles.textInput}
                  multiline
                  editable={!isSending}
                />
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleSend}
                  disabled={!inputText.trim() || isSending}
                  style={[styles.sendBtn, (!inputText.trim() || isSending) && styles.sendBtnDisabled]}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color={Colors.textInverse} />
                  ) : (
                    <Ionicons name="send" size={18} color={Colors.textInverse} />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </KeyboardAvoidingView>
        </>
      ) : (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>Ticket Not Found</Text>
          <Text style={styles.errorDesc}>This ticket could not be loaded or you don't have permission to view it.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: 8,
  },
  errorTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  errorDesc: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  subjectCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  subjectTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketCategory: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.semibold,
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.card,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  orderBadgeText: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: Typography.fontWeight.medium,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  statusText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
  },
  ticketSubject: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: 2,
  },
  openedDate: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
  keyboardContainer: {
    flex: 1,
  },
  messagesScroll: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  emptyMessages: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyMessagesText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  messageBubble: {
    maxWidth: '82%',
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Radius.xs,
  },
  bubbleSupport: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  senderHeader: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
    marginBottom: 4,
  },
  messageText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 18,
  },
  textUser: {
    color: Colors.textInverse,
  },
  textSupport: {
    color: Colors.text,
  },
  timeText: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeUser: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timeSupport: {
    color: Colors.textMuted,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    maxHeight: 90,
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  closedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  closedNoticeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
});
