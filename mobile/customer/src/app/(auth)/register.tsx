import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { CITIES } from '@/constants/mockData';
import { AppHeader, AppInput, AppButton, Modal } from '@/components/common';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/store';
import { t } from '@/localization';

type RegMethod = 'email' | 'telegram';

export default function RegisterScreen() {
  const router = useRouter();
  const { requestEmailOtp, requestTelegramOtp } = useAuth();
  const { language } = useApp();

  const [method, setMethod] = useState<RegMethod>('email');
  const [email, setEmail] = useState('');
  const [telegramPhone, setTelegramPhone] = useState('');
  const [city, setCity] = useState('Gondar');
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    setError('');

    if (method === 'email') {
      const cleanEmail = email.trim();
      if (!cleanEmail) {
        setError(t('validation.emailRequired'));
        return;
      }
      if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        setError(t('validation.invalidEmail'));
        return;
      }

      setLoading(true);
      try {
        const res = await requestEmailOtp(cleanEmail, city);
        setLoading(false);
        router.push({
          pathname: '/(auth)/verify-otp' as any,
          params: {
            method: 'email',
            identifier: cleanEmail,
            city,
          },
        });
      } catch (err: any) {
        setLoading(false);
        const msg = err.message || '';
        if (msg.includes('already exists') || msg.includes('EMAIL_EXISTS')) {
          Alert.alert(
            t('common.appName'),
            t('auth.accountExists'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('auth.signIn'), onPress: () => router.push('/(auth)/login' as any) },
            ]
          );
        } else {
          setError(msg || t('errors.general'));
        }
      }
    } else {
      // Telegram Registration
      const cleanPhone = telegramPhone.trim();
      if (!cleanPhone || cleanPhone.length < 9) {
        setError(t('validation.invalidPhone'));
        return;
      }

      setLoading(true);
      try {
        const res = await requestTelegramOtp(cleanPhone, city);
        setLoading(false);
        router.push({
          pathname: '/(auth)/verify-otp' as any,
          params: {
            method: 'telegram',
            identifier: cleanPhone,
            city,
            botUrl: res?.data?.botUrl || 'https://t.me/Ardab_market_bot',
          },
        });
      } catch (err: any) {
        setLoading(false);
        const msg = err.message || '';
        if (msg.includes('already exists') || msg.includes('PHONE_EXISTS')) {
          Alert.alert(
            t('common.appName'),
            t('auth.accountExists'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('auth.signIn'), onPress: () => router.push('/(auth)/login' as any) },
            ]
          );
        } else {
          setError(msg || t('errors.general'));
        }
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={t('auth.createAccountTitle')}
        showBack
        onBackPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(auth)/login' as any);
          }
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Header Intro with Brand Logo */}
        <View style={styles.introSection}>
          <View style={styles.logoWrapper}>
            <Image
              source={{
                uri: 'https://res.cloudinary.com/dr9umkixr/image/upload/v1789292515/5841569209974984677_ktnepe.jpg',
              }}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.title}>{t('auth.createAccountTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.createAccountSubtitle')}</Text>
        </View>

        {/* Method Switcher Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setMethod('email');
              setError('');
            }}
            style={[styles.tabButton, method === 'email' && styles.tabButtonActive]}>
            <Ionicons
              name="mail-outline"
              size={18}
              color={method === 'email' ? Colors.primary : Colors.textMuted}
            />
            <Text style={[styles.tabText, method === 'email' && styles.tabTextActive]}>
              {t('auth.methodEmail')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setMethod('telegram');
              setError('');
            }}
            style={[styles.tabButton, method === 'telegram' && styles.tabButtonActive]}>
            <Ionicons
              name="paper-plane-outline"
              size={18}
              color={method === 'telegram' ? Colors.primary : Colors.textMuted}
            />
            <Text style={[styles.tabText, method === 'telegram' && styles.tabTextActive]}>
              {t('auth.methodTelegram')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.formCard}>
          {method === 'email' ? (
            <>
              {/* Method A: Email */}
              <AppInput
                label={t('auth.email')}
                placeholder="name@example.com"
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (error) setError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon={<Ionicons name="mail-outline" size={18} color={Colors.primary} />}
              />

              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
                <Text style={styles.infoText}>
                  {t('auth.enterEmailOtp')}
                </Text>
              </View>
            </>
          ) : (
            <>
              {/* Method B: Telegram */}
              <AppInput
                label={t('auth.telegramPhone')}
                placeholder="+251 91 123 4567"
                value={telegramPhone}
                onChangeText={(val) => {
                  setTelegramPhone(val);
                  if (error) setError('');
                }}
                keyboardType="phone-pad"
                leftIcon={<Ionicons name="call-outline" size={18} color={Colors.primary} />}
              />

              <View style={styles.infoBox}>
                <Ionicons name="paper-plane" size={18} color={Colors.primary} />
                <Text style={styles.infoText}>
                  {t('auth.telegramDesc')}
                </Text>
              </View>
            </>
          )}

          {/* City Selector */}
          <Text style={styles.fieldLabel}>{t('auth.city')}</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setCityModalVisible(true)}
            style={styles.citySelector}>
            <View style={styles.citySelectorLeft}>
              <Ionicons name="location-outline" size={20} color={Colors.primary} />
              <Text style={styles.cityText}>{city}</Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Action Button */}
          <View style={styles.actionContainer}>
            <AppButton
              title={method === 'email' ? t('auth.continueWithEmail') : t('auth.continueWithTelegram')}
              loading={loading}
              onPress={handleContinue}
              variant="primary"
              size="lg"
            />
          </View>
        </View>

        {/* Footer Link to Sign In */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('auth.alreadyHaveAccount')}</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(auth)/login' as any)}>
            <Text style={styles.footerLink}>{t('auth.signIn')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* City Selection Modal */}
      <Modal
        visible={cityModalVisible}
        onClose={() => setCityModalVisible(false)}
        title={t('auth.selectCity')}>
        <View style={styles.modalCityList}>
          {CITIES.map((c) => (
            <TouchableOpacity
              key={c}
              activeOpacity={0.7}
              onPress={() => {
                setCity(c);
                setCityModalVisible(false);
              }}
              style={[
                styles.modalCityItem,
                city === c && styles.modalCityItemActive,
              ]}>
              <View style={styles.cityItemLeft}>
                <Ionicons
                  name="location"
                  size={18}
                  color={city === c ? Colors.primary : Colors.textMuted}
                />
                <Text
                  style={[
                    styles.modalCityText,
                    city === c && styles.modalCityTextActive,
                  ]}>
                  {c}
                </Text>
              </View>
              {city === c ? (
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
              ) : null}
            </TouchableOpacity>
          ))}
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  introSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoWrapper: {
    width: 60,
    height: 60,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
    lineHeight: 20,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 4,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    gap: Spacing.xs,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    ...Shadows.sm,
  },
  tabText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight + '20',
    padding: Spacing.sm + 2,
    borderRadius: Radius.md,
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSize.tiny,
    color: Colors.primaryDark,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
    marginTop: Spacing.xs,
  },
  citySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.lg,
  },
  citySelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  cityText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
    fontWeight: Typography.fontWeight.medium,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight + '25',
    padding: Spacing.sm,
    borderRadius: Radius.md,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: Colors.error,
  },
  actionContainer: {
    marginTop: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textMuted,
  },
  footerLink: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  modalCityList: {
    paddingVertical: Spacing.xs,
  },
  modalCityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalCityItemActive: {
    backgroundColor: Colors.primaryLight + '15',
    borderRadius: Radius.md,
  },
  cityItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalCityText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
  },
  modalCityTextActive: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
});
