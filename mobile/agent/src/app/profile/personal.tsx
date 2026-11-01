import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AppHeader, Badge } from '../../components/common';
import { useAgentAuth } from '../../store/AgentAuthContext';
import { formatDate } from '../../utils/date';

export default function PersonalInfoScreen() {
  const { agent } = useAgentAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Personal Information"
        subtitle="Registered agent credentials & details"
        showBack
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Notice Card */}
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
          <Text style={styles.noticeText}>
            Agent registration information, commission rates, and approval status are managed exclusively by the Ardab Market Super Admin team.
          </Text>
        </View>

        {/* Profile Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Agent Identity</Text>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Full Legal Name</Text>
            <Text style={styles.fieldValue}>{agent?.name}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Agent Reference ID</Text>
            <Text style={styles.fieldValueBold}>{agent?.agentReference}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Account Status</Text>
            <Badge label={agent?.accountStatus || 'ACTIVE'} variant="success" />
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Assigned Commission Rate</Text>
            <Text style={[styles.fieldValueBold, { color: Colors.primary }]}>
              {agent?.commissionRate}%
            </Text>
          </View>
        </View>

        {/* Contact Details */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Verified Contact Information</Text>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Registered Email</Text>
            <Text style={styles.fieldValue}>{agent?.email}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Registered Phone</Text>
            <Text style={styles.fieldValue}>{agent?.phone}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Operating Region</Text>
            <Text style={styles.fieldValue}>{agent?.city}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Registration Date</Text>
            <Text style={styles.fieldValue}>{formatDate(agent?.registeredAt)}</Text>
          </View>
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
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
    gap: Spacing.sm,
  },
  noticeText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: Colors.primaryDark,
    lineHeight: 18,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  cardHeading: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  fieldLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  fieldValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text,
  },
  fieldValueBold: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.xs + 2,
  },
});

