import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/theme';
import { useApp } from '@/store';
import { AppHeader, AppInput, AppButton } from '@/components/common';
import { t } from '@/localization';
import { profileApi } from '@/services/profileApi';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useApp();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState(user?.city || 'Gondar');
  const [deliveryZone, setDeliveryZone] = useState('');
  const [customerCode, setCustomerCode] = useState('');

  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch fresh profile from backend on mount
  useEffect(() => {
    let isMounted = true;
    async function loadFreshProfile() {
      try {
        setIsFetching(true);
        const data = await profileApi.getProfile();
        if (isMounted && data) {
          if (data.fullName) setFullName(data.fullName);
          if (data.email) setEmail(data.email);
          if (data.phone) setPhone(data.phone);
          if (data.city) setCity(data.city);
          if (data.deliveryZone) setDeliveryZone(data.deliveryZone);
          if (data.customerCode) setCustomerCode(data.customerCode);
        }
      } catch (err) {
        console.warn('[EditProfile] Failed to fetch fresh profile:', err);
      } finally {
        if (isMounted) setIsFetching(false);
      }
    }
    loadFreshProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    if (isSaving) return;
    if (!fullName.trim()) {
      setErrorMessage(t('validation.nameRequired') || 'Full name is required.');
      return;
    }
    setErrorMessage(null);
    setIsSaving(true);
    try {
      await updateUser({
        fullName: fullName.trim(),
        city: city.trim(),
        ...({ deliveryZone: deliveryZone.trim() } as any),
      });
      setSavedToast(true);
      setTimeout(() => {
        setSavedToast(false);
        router.back();
      }, 900);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update profile. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const initials = fullName
    ? fullName
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('profile.editProfile')} showBack />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          {customerCode ? (
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>{customerCode}</Text>
            </View>
          ) : null}
        </View>

        {isFetching ? (
          <View style={styles.fetchingRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.fetchingText}>Loading latest details...</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {savedToast ? (
          <View style={styles.savedBanner}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            <Text style={styles.savedText}>{t('success.profileUpdated') || 'Profile updated successfully!'}</Text>
          </View>
        ) : null}

        {/* Editable Name */}
        <AppInput
          label={t('profile.fullName')}
          value={fullName}
          onChangeText={(val) => {
            setFullName(val);
            if (errorMessage) setErrorMessage(null);
          }}
          leftIcon={<Ionicons name="person-outline" size={18} color={Colors.primary} />}
          placeholder="Enter your full name"
        />

        {/* Editable City */}
        <AppInput
          label={t('profile.city')}
          value={city}
          onChangeText={setCity}
          leftIcon={<Ionicons name="location-outline" size={18} color={Colors.primary} />}
          placeholder="e.g. Gondar, Addis Ababa"
        />

        {/* Editable Subcity / Delivery Zone */}
        <AppInput
          label="Neighborhood / Delivery Zone"
          value={deliveryZone}
          onChangeText={setDeliveryZone}
          leftIcon={<Ionicons name="business-outline" size={18} color={Colors.primary} />}
          placeholder="e.g. Arada, Maraki, Piazza"
        />

        {/* Protected Email Field */}
        <View style={styles.protectedFieldContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>{t('profile.email')}</Text>
            <View style={styles.securityBadge}>
              <Ionicons name="shield-checkmark" size={12} color={Colors.success} />
              <Text style={styles.securityBadgeText}>Verified Account</Text>
            </View>
          </View>
          <View style={styles.readOnlyBox}>
            <Ionicons name="mail-outline" size={18} color={Colors.textMuted} />
            <Text style={styles.readOnlyText}>{email || 'No email attached'}</Text>
          </View>
          <Text style={styles.securityHint}>Email is locked for account safety. Contact support to change it.</Text>
        </View>

        {/* Protected Phone Field */}
        <View style={styles.protectedFieldContainer}>
          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>{t('profile.phone')}</Text>
            <View style={styles.securityBadge}>
              <Ionicons name="shield-checkmark" size={12} color={Colors.success} />
              <Text style={styles.securityBadgeText}>Verified Phone</Text>
            </View>
          </View>
          <View style={styles.readOnlyBox}>
            <Ionicons name="call-outline" size={18} color={Colors.textMuted} />
            <Text style={styles.readOnlyText}>{phone || 'No phone attached'}</Text>
          </View>
          <Text style={styles.securityHint}>Phone number is verified. Contact support for assistance.</Text>
        </View>

        <AppButton
          title={isSaving ? 'Saving Changes...' : (t('common.save') || 'Save Changes')}
          variant="primary"
          size="lg"
          onPress={handleSave}
          disabled={isSaving}
          loading={isSaving}
          style={{ marginTop: Spacing.lg, marginBottom: Spacing.xl }}
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarText: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  codeBadge: {
    marginTop: 6,
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  codeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    fontWeight: Typography.fontWeight.medium,
  },
  fetchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  fetchingText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
  },
  protectedFieldContainer: {
    marginVertical: Spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  securityBadgeText: {
    fontSize: 10,
    color: Colors.success,
    fontWeight: Typography.fontWeight.bold,
  },
  readOnlyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  readOnlyText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
  },
  securityHint: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: Spacing.sm,
    paddingHorizontal: 2,
  },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginVertical: Spacing.sm,
  },
  savedText: {
    color: Colors.success,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDE8E8',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginVertical: Spacing.sm,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    flex: 1,
  },
});
