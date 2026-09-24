import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { AppHeader, AppButton } from '@/components/common';

export default function PaymentScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Payment Options" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Secure Marketplace Payments</Text>
        <Text style={styles.subtitle}>
          Ardab Market holds payments in verified escrow until your goods arrive safely at your doorstep in Ethiopia.
        </Text>

        <View style={styles.methodCard}>
          <Ionicons name="cash-outline" size={28} color={Colors.primary} />
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>Cash on Delivery (COD)</Text>
            <Text style={styles.methodDesc}>Pay cash directly to the Ardab courier upon order delivery.</Text>
          </View>
        </View>

        <View style={styles.methodCard}>
          <Ionicons name="phone-portrait-outline" size={28} color={Colors.primary} />
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>Telebirr Mobile Payment</Text>
            <Text style={styles.methodDesc}>Direct seamless checkout via Telebirr merchant pay.</Text>
          </View>
        </View>

        <View style={styles.methodCard}>
          <Ionicons name="card-outline" size={28} color={Colors.primary} />
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>CBE Birr & CBE Mobile</Text>
            <Text style={styles.methodDesc}>Commercial Bank of Ethiopia verified integration.</Text>
          </View>
        </View>

        <AppButton
          title="Back to Checkout"
          variant="primary"
          size="lg"
          onPress={() => router.back()}
          style={{ marginTop: Spacing.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.xl,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  methodDesc: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
