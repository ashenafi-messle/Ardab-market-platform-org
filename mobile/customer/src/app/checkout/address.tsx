import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { useApp } from '@/store';
import { AppHeader, AppInput, AppButton, Modal } from '@/components/common';
import { CITIES } from '@/constants/mockData';
import { t } from '@/localization';

export default function AddressManagementScreen() {
  const router = useRouter();
  const { addresses, addAddress, language } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Gondar');
  const [subcity, setSubcity] = useState('');
  const [specificAddress, setSpecificAddress] = useState('');
  const [cityModalVisible, setCityModalVisible] = useState(false);

  const handleSaveAddress = () => {
    if (!fullName.trim() || !phone.trim() || !specificAddress.trim()) {
      return;
    }
    addAddress({
      fullName,
      phone,
      city,
      subcity,
      specificAddress,
      isDefault: addresses.length === 0,
    });
    setShowAddForm(false);
    setFullName('');
    setPhone('');
    setSpecificAddress('');
    setSubcity('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('checkout.deliveryAddress')} showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Saved Addresses List */}
        <Text style={styles.sectionTitle}>{t('profile.addresses')}</Text>
        {addresses.map((addr) => (
          <View key={addr.id} style={styles.addressCard}>
            <View style={styles.cardHeader}>
              <View style={styles.nameRow}>
                <Ionicons name="home-outline" size={18} color={Colors.primary} />
                <Text style={styles.fullName}>{addr.fullName}</Text>
                {addr.isDefault ? (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <Text style={styles.phoneText}>{addr.phone}</Text>
            <Text style={styles.addressText}>
              {addr.specificAddress}, {addr.subcity ? `${addr.subcity}, ` : ''}
              {addr.city}
            </Text>
          </View>
        ))}

        {/* Add Address Form Toggle */}
        {!showAddForm ? (
          <AppButton
            title={t('checkout.addNewAddress')}
            variant="outline"
            size="md"
            onPress={() => setShowAddForm(true)}
            style={styles.addBtn}
          />
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{t('checkout.addNewAddress')}</Text>

            <AppInput
              label={t('checkout.recipientName')}
              placeholder="e.g. Yonas Tadesse"
              value={fullName}
              onChangeText={setFullName}
            />

            <AppInput
              label={t('auth.phone')}
              placeholder="e.g. +251 91 123 4567"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.cityPickerContainer}>
              <Text style={styles.cityPickerLabel}>{t('checkout.city')}</Text>
              <TouchableOpacity
                onPress={() => setCityModalVisible(true)}
                style={styles.cityPickerBtn}>
                <Text style={styles.cityPickerText}>{city}</Text>
                <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <AppInput
              label="Subcity / Kebele"
              placeholder="e.g. Maraki, Kebele 16"
              value={subcity}
              onChangeText={setSubcity}
            />

            <AppInput
              label={t('checkout.specificAddress')}
              placeholder="e.g. Near University Gate 2"
              value={specificAddress}
              onChangeText={setSpecificAddress}
            />

            <View style={styles.formActionButtons}>
              <AppButton
                title={t('common.cancel')}
                variant="ghost"
                size="md"
                onPress={() => setShowAddForm(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                title={t('common.save')}
                variant="primary"
                size="md"
                onPress={handleSaveAddress}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* City Picker Modal */}
      <Modal
        visible={cityModalVisible}
        onClose={() => setCityModalVisible(false)}
        title={t('auth.selectCity')}>
        {CITIES.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => {
              setCity(c);
              setCityModalVisible(false);
            }}
            style={styles.modalCityItem}>
            <Text style={styles.modalCityText}>{c}</Text>
            {city === c ? (
              <Ionicons name="checkmark" size={18} color={Colors.primary} />
            ) : null}
          </TouchableOpacity>
        ))}
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
    padding: Spacing.lg,
    paddingBottom: Spacing.huge,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  addressCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  fullName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  defaultBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    marginLeft: Spacing.xs,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  phoneText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  addressText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text,
    lineHeight: 18,
  },
  addBtn: {
    marginTop: Spacing.sm,
  },
  formCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
  },
  formTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  cityPickerContainer: {
    marginBottom: Spacing.md,
  },
  cityPickerLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  cityPickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1.2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  cityPickerText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
  },
  formActionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalCityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalCityText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
  },
});
