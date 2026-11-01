import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';
import { AppHeader } from '../../components/common';

export default function NotificationPreferencesScreen() {
  const [orderAlerts, setOrderAlerts] = useState(true);
  const [commissionAlerts, setCommissionAlerts] = useState(true);
  const [disbursementAlerts, setDisbursementAlerts] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Notification Preferences"
        subtitle="Manage alerts and push notifications"
        showBack
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Order Accepted */}
          <View style={styles.prefRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefTitle}>Accepted Customer Orders</Text>
              <Text style={styles.prefDesc}>
                Receive alerts immediately when Super Admin accepts orders placed by your integrated customers.
              </Text>
            </View>
            <Switch
              value={orderAlerts}
              onValueChange={setOrderAlerts}
              trackColor={{ false: Colors.border, true: Colors.primaryMuted }}
              thumbColor={orderAlerts ? Colors.primary : '#FFFFFF'}
            />
          </View>

          <View style={styles.divider} />

          {/* Commission Approval */}
          <View style={styles.prefRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefTitle}>Commission Approval Alerts</Text>
              <Text style={styles.prefDesc}>
                Get notified when calculated commissions are confirmed and credited to your balance.
              </Text>
            </View>
            <Switch
              value={commissionAlerts}
              onValueChange={setCommissionAlerts}
              trackColor={{ false: Colors.border, true: Colors.primaryMuted }}
              thumbColor={commissionAlerts ? Colors.primary : '#FFFFFF'}
            />
          </View>

          <View style={styles.divider} />

          {/* Disbursement */}
          <View style={styles.prefRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefTitle}>Payout & Settlement Notices</Text>
              <Text style={styles.prefDesc}>
                Alerts when commission funds are transferred to your registered Telebirr/CBE account.
              </Text>
            </View>
            <Switch
              value={disbursementAlerts}
              onValueChange={setDisbursementAlerts}
              trackColor={{ false: Colors.border, true: Colors.primaryMuted }}
              thumbColor={disbursementAlerts ? Colors.primary : '#FFFFFF'}
            />
          </View>

          <View style={styles.divider} />

          {/* System */}
          <View style={styles.prefRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefTitle}>System Announcements</Text>
              <Text style={styles.prefDesc}>
                Important announcements regarding platform terms, holiday schedules, and policies.
              </Text>
            </View>
            <Switch
              value={systemAlerts}
              onValueChange={setSystemAlerts}
              trackColor={{ false: Colors.border, true: Colors.primaryMuted }}
              thumbColor={systemAlerts ? Colors.primary : '#FFFFFF'}
            />
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
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  prefTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  prefDesc: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.md,
  },
});

