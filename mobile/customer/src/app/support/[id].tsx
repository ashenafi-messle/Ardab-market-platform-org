import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { MOCK_SUPPORT_TICKETS } from '@/constants/mockData';
import { AppHeader } from '@/components/common';
import { t } from '@/localization';

export default function TicketConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const initialTicket =
    MOCK_SUPPORT_TICKETS.find((t) => t.id === id) || MOCK_SUPPORT_TICKETS[0];

  const [messages, setMessages] = useState(initialTicket.messages);
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: 'customer' as const,
      text: inputText.trim(),
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    // Mock agent auto-response simulation
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          sender: 'support' as const,
          text: 'Thank you for updating your ticket. Our customer care team in Gondar has recorded your message.',
          timestamp: 'Just now',
        },
      ]);
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <AppHeader title={`${t('support.title')} #${initialTicket.ticketNumber}`} showBack />

      {/* Ticket Subject Card */}
      <View style={styles.subjectCard}>
        <View style={styles.subjectTop}>
          <Text style={styles.ticketCategory}>{initialTicket.category}</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{initialTicket.status.replace('_', ' ')}</Text>
          </View>
        </View>
        <Text style={styles.ticketSubject}>{initialTicket.subject}</Text>
      </View>

      {/* Conversation Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesScroll}>
          {messages.map((m) => {
            const isUser = m.sender === 'customer';
            return (
              <View
                key={m.id}
                style={[styles.messageBubble, isUser ? styles.bubbleUser : styles.bubbleSupport]}>
                <Text style={[styles.messageText, isUser ? styles.textUser : styles.textSupport]}>
                  {m.text}
                </Text>
                <Text style={[styles.timeText, isUser ? styles.timeUser : styles.timeSupport]}>
                  {m.timestamp}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('support.messagePlaceholder')}
            placeholderTextColor={Colors.textMuted}
            style={styles.textInput}
            multiline
          />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSend}
            disabled={!inputText.trim()}
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}>
            <Ionicons name="send" size={18} color={Colors.textInverse} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
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
  ticketCategory: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.semibold,
  },
  statusPill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  statusText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  ticketSubject: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  keyboardContainer: {
    flex: 1,
  },
  messagesScroll: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
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
});
