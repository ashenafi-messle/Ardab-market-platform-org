import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { MOCK_SUPPORT_TICKETS } from '@/constants/mockData';
import { AppHeader, AppButton } from '@/components/common';
import { t } from '@/localization';

export default function SupportHomeScreen() {
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

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
      <AppHeader title={t('support.title')} showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Contact Support Channels */}
        <Text style={styles.sectionTitle}>{t('support.contactSupport')}</Text>
        <View style={styles.channelsGrid}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => Linking.openURL('tel:+251911000000').catch(() => {})}
            style={styles.channelCard}>
            <View style={styles.channelIconCircle}>
              <Ionicons name="call" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.channelName}>{t('support.callUs')}</Text>
            <Text style={styles.channelDesc}>+251 91 100 0000</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => Linking.openURL('mailto:support@ardab.com').catch(() => {})}
            style={styles.channelCard}>
            <View style={styles.channelIconCircle}>
              <Ionicons name="mail" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.channelName}>{t('support.emailUs')}</Text>
            <Text style={styles.channelDesc}>support@ardab.com</Text>
          </TouchableOpacity>
        </View>

        {/* Support Tickets Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('support.title')}</Text>
        </View>

        {MOCK_SUPPORT_TICKETS.map((ticket) => (
          <TouchableOpacity
            key={ticket.id}
            activeOpacity={0.85}
            onPress={() => router.push(`/support/${ticket.id}` as any)}
            style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <Text style={styles.ticketNumber}>{ticket.ticketNumber}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{ticket.status.replace('_', ' ')}</Text>
              </View>
            </View>
            <Text style={styles.ticketSubject} numberOfLines={2}>
              {ticket.subject}
            </Text>
            <View style={styles.ticketFooter}>
              <Text style={styles.ticketCategory}>{ticket.category}</Text>
              <Text style={styles.ticketTime}>Updated {ticket.lastUpdated}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* FAQs Accordion */}
        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>
          {t('support.faq')}
        </Text>
        {faqs.map((faq, idx) => {
          const isExpanded = expandedFaq === idx;
          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.85}
              onPress={() => setExpandedFaq(isExpanded ? null : idx)}
              style={styles.faqCard}>
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
    marginBottom: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  channelsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
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
    width: 44,
    height: 44,
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
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  ticketNumber: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  statusBadge: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  statusText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.warning,
  },
  ticketSubject: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    lineHeight: 18,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.xs,
  },
  ticketCategory: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  ticketTime: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  faqCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.xs,
    ...Shadows.sm,
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
    lineHeight: 18,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.xs,
  },
});
