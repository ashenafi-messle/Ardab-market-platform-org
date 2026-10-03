import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Platform, ToastAndroid, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/theme';
import { useApp } from '@/store';
import { t } from '@/utils/i18n';
import { ProfileHeader, ProfileMenuItem } from '@/components/profile';
import { Modal, AppButton } from '@/components/common';
import { ARDAB_LICENSE_URL } from '@/constants/branding';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout, language, changeLanguage, wishlistProductIds, orders } =
    useApp();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [licenseModalVisible, setLicenseModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const performLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      if (Platform.OS === 'android') {
        ToastAndroid.show(t('auth.signedOutSuccess') || 'You have been signed out.', ToastAndroid.SHORT);
      }
    } catch (err) {
      console.warn('[ProfileScreen] Logout error:', err);
    } finally {
      setIsLoggingOut(false);
      setLogoutModalVisible(false);
      try {
        if (router.canDismiss()) {
          router.dismissAll();
        }
      } catch {}
      // Unconditionally redirect to sign in / login screen
      router.replace('/(auth)/login' as any);
    }
  };

  const handleLogout = () => {
    if (isLoggingOut) return;
    setLogoutModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.title')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <ProfileHeader
          user={user}
          onEditPress={() => router.push('/profile/edit' as any)}
          onLoginPress={() => router.push('/(auth)/login' as any)}
        />

        {/* Section: Marketplace Activity */}
        <Text style={styles.sectionHeading}>{t('profile.sectionActivity')}</Text>
        <ProfileMenuItem
          icon="bag-handle-outline"
          title={t('profile.myOrders')}
          subtitle={t('orders.noOrdersSub')}
          badge={orders.length}
          onPress={() => router.push('/(tabs)/orders' as any)}
        />
        <ProfileMenuItem
          icon="heart-outline"
          title={t('profile.wishlist')}
          subtitle={t('wishlist.emptySub')}
          badge={wishlistProductIds.length}
          onPress={() => router.push('/wishlist' as any)}
        />
        <ProfileMenuItem
          icon="location-outline"
          title={t('profile.addresses')}
          subtitle={t('checkout.deliveryAddress')}
          onPress={() => router.push('/checkout/address' as any)}
        />
        <ProfileMenuItem
          icon="notifications-outline"
          title={t('profile.notifications')}
          subtitle={t('home.specialOffers')}
          onPress={() => router.push('/profile/notifications' as any)}
        />
        <ProfileMenuItem
          icon="card-outline"
          title="Payment History"
          subtitle="Transactions & verified receipts"
          onPress={() => router.push('/profile/payments' as any)}
        />

        {/* Section: Settings & Preferences */}
        <Text style={styles.sectionHeading}>{t('profile.sectionPreferences')}</Text>
        <ProfileMenuItem
          icon="globe-outline"
          title={t('profile.language')}
          subtitle={language === 'am' ? 'አማርኛ (Amharic)' : 'English'}
          onPress={() => router.push('/profile/language' as any)}
        />
        <ProfileMenuItem
          icon="shield-checkmark-outline"
          title={t('profile.security')}
          subtitle={t('profile.changePassword')}
          onPress={() => router.push('/profile/security' as any)}
        />

        {/* Section: Help & Info */}
        <Text style={styles.sectionHeading}>{t('profile.sectionSupport')}</Text>
        <ProfileMenuItem
          icon="headset-outline"
          title={t('profile.support')}
          subtitle={t('support.contactSupport')}
          onPress={() => router.push('/support' as any)}
        />
        <ProfileMenuItem
          icon="ribbon-outline"
          title={language === 'am' ? 'ህጋዊ የንግድ ፈቃድ' : 'Official Business License'}
          subtitle={language === 'am' ? 'የተረጋገጠ የንግድ ምዝገባ ሰነድ' : 'Verified Commercial Registration'}
          onPress={() => setLicenseModalVisible(true)}
        />
        <ProfileMenuItem
          icon="information-circle-outline"
          title={t('profile.about')}
          subtitle={t('home.verifiedMarketplace')}
          onPress={() => setAboutModalVisible(true)}
        />

        {/* Sign Out Action */}
        {isAuthenticated ? (
          <View style={styles.logoutWrapper}>
            <ProfileMenuItem
              icon={isLoggingOut ? 'hourglass-outline' : 'log-out-outline'}
              title={isLoggingOut ? (t('auth.signingOut') || 'Signing out...') : t('profile.logout')}
              onPress={handleLogout}
              isDestructive
              showChevron={false}
            />
          </View>
        ) : null}
      </ScrollView>

      {/* Language Switcher Modal */}
      <Modal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
        title={t('lang.selectorTitle')}>
        <Text style={styles.modalDesc}>
          {t('profile.languageHint')}
        </Text>
        <View style={styles.langOptions}>
          <AppButton
            title="English"
            variant={language === 'en' ? 'primary' : 'outline'}
            onPress={() => {
              changeLanguage('en');
              setLangModalVisible(false);
            }}
            style={styles.langBtn}
          />
          <AppButton
            title="አማርኛ (Amharic)"
            variant={language === 'am' ? 'primary' : 'outline'}
            onPress={() => {
              changeLanguage('am');
              setLangModalVisible(false);
            }}
            style={styles.langBtn}
          />
        </View>
      </Modal>

      {/* About Ardab Market Modal */}
      <Modal
        visible={aboutModalVisible}
        onClose={() => setAboutModalVisible(false)}
        title={t('profile.about')}>
        <Text style={styles.aboutTitle}>{t('common.appName')}</Text>
        <View style={styles.aboutSloganBadge}>
          <Text style={styles.aboutSloganText}>
            {language === 'am' ? '“ጥራትና ታማኝነት፣ እስከ ቤትዎ ድረስ!”' : '“Quality and Trust, Delivered to Your Door!”'}
          </Text>
        </View>
        <Text style={styles.aboutText}>
          {t('profile.aboutDesc1')}
        </Text>
        <Text style={styles.aboutText}>
          {t('profile.aboutDesc2')}
        </Text>
        <Text style={styles.aboutVersion}>{t('profile.version')}</Text>
        <AppButton
          title={language === 'am' ? 'ህጋዊ የንግድ ፈቃድ ይመልከቱ' : 'View Commercial License'}
          variant="outline"
          size="sm"
          onPress={() => {
            setAboutModalVisible(false);
            setLicenseModalVisible(true);
          }}
          style={{ marginTop: Spacing.sm }}
        />
      </Modal>

      {/* Official Business License Modal */}
      <Modal
        visible={licenseModalVisible}
        onClose={() => setLicenseModalVisible(false)}
        title={language === 'am' ? 'ህጋዊ የንግድ ፈቃድ' : 'Official Business License'}>
        <View style={styles.licenseCard}>
          <View style={styles.licenseHeaderBadge}>
            <Ionicons name="shield-checkmark" size={16} color={Colors.primary} />
            <Text style={styles.licenseBadgeText}>
              {language === 'am' ? 'የተረጋገጠ የኢትዮጵያ ንግድ ፈቃድ' : 'Verified Commercial Registration'}
            </Text>
          </View>
          <View style={styles.licenseImageWrapper}>
            <Image
              source={{ uri: ARDAB_LICENSE_URL }}
              style={styles.licenseImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.licenseNote}>
            {language === 'am'
              ? 'አርዳብ ገበያ በህግ የተመዘገበና የመንግስት ንግድ ፈቃድ ያሟላ የታመነ መድረክ ነው።'
              : 'Ardab Market operates with active government commercial licensing and full regulatory compliance.'}
          </Text>
        </View>
        <AppButton
          title={t('common.close') || 'Close'}
          variant="primary"
          onPress={() => setLicenseModalVisible(false)}
          style={{ marginTop: Spacing.md }}
        />
      </Modal>

      {/* Sign Out Confirmation Modal */}
      <Modal
        visible={logoutModalVisible}
        onClose={() => !isLoggingOut && setLogoutModalVisible(false)}
        title={t('auth.signOutConfirmTitle') || t('profile.logout')}>
        <Text style={styles.modalDesc}>
          {t('auth.confirmSignOut') || t('profile.logoutConfirm') || 'Are you sure you want to sign out?'}
        </Text>
        <View style={styles.logoutModalActions}>
          <AppButton
            title={t('auth.cancel') || 'Cancel'}
            variant="outline"
            disabled={isLoggingOut}
            onPress={() => setLogoutModalVisible(false)}
            style={styles.modalActionBtn}
          />
          <AppButton
            title={isLoggingOut ? (t('auth.signingOut') || 'Signing out...') : (t('profile.logout') || 'Sign Out')}
            variant="danger"
            loading={isLoggingOut}
            disabled={isLoggingOut}
            onPress={performLogout}
            style={styles.modalActionBtn}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.huge,
  },
  sectionHeading: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  logoutWrapper: {
    marginTop: Spacing.xl,
  },
  modalDesc: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  logoutModalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  modalActionBtn: {
    flex: 1,
  },
  langOptions: {
    gap: Spacing.md,
  },
  langBtn: {
    marginBottom: Spacing.xs,
  },
  aboutTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
    marginBottom: 4,
  },
  aboutSloganBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#D1E7DD',
  },
  aboutSloganText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  aboutText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  aboutVersion: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  licenseCard: {
    paddingVertical: Spacing.xs,
  },
  licenseHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#D1E7DD',
  },
  licenseBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
    flex: 1,
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
  licenseNote: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
