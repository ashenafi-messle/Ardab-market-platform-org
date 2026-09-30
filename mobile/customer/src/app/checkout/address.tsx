import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { useApp } from '@/store';
import { AppHeader, AppInput, AppButton, Modal } from '@/components/common';
import { CITIES } from '@/constants/mockData';
import { t } from '@/localization';
import { Address } from '@/types';

export default function AddressManagementScreen() {
  const router = useRouter();
  const {
    addresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    refreshAddresses,
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form State
  const [formVisible, setFormVisible] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Gondar');
  const [subcity, setSubcity] = useState('');
  const [specificAddress, setSpecificAddress] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    refreshAddresses().catch(() => {});
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAddresses();
    } finally {
      setRefreshing(false);
    }
  };

  const openAddForm = () => {
    setEditingAddressId(null);
    setFullName('');
    setPhone('');
    setCity('Gondar');
    setSubcity('');
    setSpecificAddress('');
    setIsDefault(addresses.length === 0);
    setFormVisible(true);
  };

  const openEditForm = (addr: Address) => {
    setEditingAddressId(addr.id);
    setFullName(addr.fullName || (addr as any).recipientName || '');
    setPhone(addr.phone || '');
    setCity(addr.city || 'Gondar');
    setSubcity(addr.subcity || (addr as any).deliveryZone || '');
    setSpecificAddress(addr.specificAddress || (addr as any).addressLine || '');
    setIsDefault(Boolean(addr.isDefault));
    setFormVisible(true);
  };

  const handleSaveAddress = async () => {
    if (!fullName.trim()) {
      Alert.alert(t('common.error') || 'Error', 'Please enter recipient full name');
      return;
    }
    if (!phone.trim()) {
      Alert.alert(t('common.error') || 'Error', 'Please enter a valid phone number');
      return;
    }
    if (!specificAddress.trim()) {
      Alert.alert(t('common.error') || 'Error', 'Please enter delivery address details');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingAddressId) {
        await updateAddress(editingAddressId, {
          fullName: fullName.trim(),
          phone: phone.trim(),
          city,
          subcity: subcity.trim(),
          specificAddress: specificAddress.trim(),
          isDefault,
        });
      } else {
        await addAddress({
          fullName: fullName.trim(),
          phone: phone.trim(),
          city,
          subcity: subcity.trim(),
          specificAddress: specificAddress.trim(),
          isDefault: isDefault || addresses.length === 0,
        });
      }
      setFormVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save address');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = (addr: Address) => {
    Alert.alert(
      'Delete Address',
      `Are you sure you want to remove the address for ${addr.fullName}?`,
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAddress(addr.id);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete address');
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await setDefaultAddress(addressId);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to set default address');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('checkout.deliveryAddress')} showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }>
        {/* Saved Addresses List */}
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>{t('profile.addresses')}</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={openAddForm}
            style={styles.headerAddBtn}>
            <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.headerAddText}>{t('checkout.addNewAddress')}</Text>
          </TouchableOpacity>
        </View>

        {addresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No saved addresses yet</Text>
            <Text style={styles.emptyDesc}>
              Add your delivery address in Gondar or Addis Ababa to speed up checkout.
            </Text>
            <AppButton
              title={t('checkout.addNewAddress')}
              variant="primary"
              size="md"
              onPress={openAddForm}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        ) : (
          addresses.map((addr) => {
            const isDef = Boolean(addr.isDefault);
            return (
              <View key={addr.id} style={[styles.addressCard, isDef && styles.addressCardDefault]}>
                <View style={styles.cardHeader}>
                  <View style={styles.nameRow}>
                    <Ionicons
                      name={isDef ? 'home' : 'location'}
                      size={18}
                      color={isDef ? Colors.primary : Colors.textSecondary}
                    />
                    <Text style={styles.fullName}>{addr.fullName}</Text>
                    {isDef ? (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={() => openEditForm(addr)}
                      style={styles.actionIconBtn}
                      accessibilityLabel="Edit address">
                      <Ionicons name="pencil-outline" size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(addr)}
                      style={styles.actionIconBtn}
                      accessibilityLabel="Delete address">
                      <Ionicons name="trash-outline" size={18} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.phoneText}>{addr.phone}</Text>
                <Text style={styles.addressText}>
                  {addr.specificAddress || (addr as any).addressLine}
                  {addr.subcity || (addr as any).deliveryZone ? `, ${addr.subcity || (addr as any).deliveryZone}` : ''}
                  {`, ${addr.city}`}
                </Text>

                {!isDef ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleSetDefault(addr.id)}
                    style={styles.setDefaultBtn}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={Colors.primary} />
                    <Text style={styles.setDefaultText}>Set as Default</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add / Edit Address Modal */}
      <Modal
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        title={editingAddressId ? 'Edit Address' : t('checkout.addNewAddress')}>
        <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
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
              activeOpacity={0.8}
              onPress={() => setCityModalVisible(true)}
              style={styles.cityPickerBtn}>
              <Text style={styles.cityPickerText}>{city}</Text>
              <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <AppInput
            label="Subcity / Kebele / Area"
            placeholder="e.g. Azezo, Kebele 16, Piazza"
            value={subcity}
            onChangeText={setSubcity}
          />

          <AppInput
            label={t('checkout.specificAddress')}
            placeholder="e.g. House #45, Near High School"
            value={specificAddress}
            onChangeText={setSpecificAddress}
          />

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsDefault(!isDefault)}
            style={styles.checkboxRow}>
            <Ionicons
              name={isDefault ? 'checkbox' : 'square-outline'}
              size={22}
              color={isDefault ? Colors.primary : Colors.textMuted}
            />
            <Text style={styles.checkboxLabel}>Make this my default delivery address</Text>
          </TouchableOpacity>

          <View style={styles.formActionButtons}>
            <AppButton
              title={t('common.cancel')}
              variant="outline"
              size="md"
              onPress={() => setFormVisible(false)}
              style={{ flex: 1 }}
            />
            <AppButton
              title={formSubmitting ? 'Saving...' : t('common.save')}
              variant="primary"
              size="md"
              disabled={formSubmitting}
              onPress={handleSaveAddress}
              style={{ flex: 1 }}
            />
          </View>
        </ScrollView>
      </Modal>

      {/* City Selector Modal */}
      <Modal
        visible={cityModalVisible}
        onClose={() => setCityModalVisible(false)}
        title={t('checkout.selectCity') || 'Select City'}>
        <View style={styles.cityList}>
          {CITIES.map((c) => (
            <TouchableOpacity
              key={c}
              activeOpacity={0.8}
              onPress={() => {
                setCity(c);
                setCityModalVisible(false);
              }}
              style={[styles.cityItem, city === c && styles.cityItemActive]}>
              <Text style={[styles.cityText, city === c && styles.cityTextActive]}>{c}</Text>
              {city === c ? <Ionicons name="checkmark" size={18} color={Colors.primary} /> : null}
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
    padding: Spacing.lg,
    paddingBottom: Spacing.huge,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  headerAddText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptyDesc: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  addressCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  addressCardDefault: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  fullName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  defaultBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    marginLeft: Spacing.xs,
  },
  defaultBadgeText: {
    color: Colors.primaryDark,
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionIconBtn: {
    padding: 6,
    borderRadius: Radius.sm,
  },
  phoneText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  addressText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
    lineHeight: 20,
  },
  setDefaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  setDefaultText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  modalScroll: {
    maxHeight: 460,
  },
  cityPickerContainer: {
    marginBottom: Spacing.md,
  },
  cityPickerLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  cityPickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
  },
  cityPickerText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  checkboxLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text,
  },
  formActionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  cityList: {
    gap: Spacing.xs,
  },
  cityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  cityItemActive: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.sm,
  },
  cityText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text,
  },
  cityTextActive: {
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.bold,
  },
});
