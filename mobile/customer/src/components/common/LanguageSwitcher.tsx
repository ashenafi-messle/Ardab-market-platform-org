import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { useApp } from '@/store';
import { t, Language } from '@/localization';

export interface LanguageSwitcherProps {
  compact?: boolean;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ compact = true }) => {
  const { language, changeLanguage } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  const openModal = () => {
    setModalVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.94,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      if (callback) callback();
    });
  };

  const handleSelectLanguage = (newLang: Language) => {
    if (newLang !== language) {
      changeLanguage(newLang);
    }
    closeModal();
  };

  const activeLabel = language === 'am' ? 'አማ' : 'EN';

  return (
    <View>
      {/* Header Pill Button */}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={openModal}
        accessibilityRole="button"
        accessibilityLabel={`Change Language, current: ${language === 'am' ? 'Amharic' : 'English'}`}
        style={[styles.pillContainer, compact ? styles.pillCompact : styles.pillRegular]}>
        <Ionicons name="globe-outline" size={16} color={Colors.primary} style={styles.globeIcon} />
        <Text style={styles.pillText}>{activeLabel}</Text>
        <Ionicons name="chevron-down" size={13} color={Colors.textMuted} style={styles.chevronIcon} />
      </TouchableOpacity>

      {/* Smooth Modal Dropdown */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={() => closeModal()}>
        <Pressable style={styles.backdrop} onPress={() => closeModal()}>
          <Animated.View
            style={[
              styles.dropdownCard,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}>
            {/* Header */}
            <View style={styles.dropdownHeader}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="language-outline" size={20} color={Colors.primary} />
                <Text style={styles.dropdownTitle}>{t('lang.selectorTitle')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => closeModal()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.dropdownSubtitle}>{t('lang.selectorSubtitle')}</Text>

            {/* Language Options */}
            <View style={styles.optionsList}>
              {/* English Option */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleSelectLanguage('en')}
                style={[
                  styles.optionRow,
                  language === 'en' && styles.optionRowActive,
                ]}>
                <View style={styles.optionLeft}>
                  <View style={[styles.flagBadge, language === 'en' && styles.flagBadgeActive]}>
                    <Text style={styles.flagText}>EN</Text>
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.optionLabel,
                        language === 'en' && styles.optionLabelActive,
                      ]}>
                      English
                    </Text>
                    <Text style={styles.optionSub}>Default</Text>
                  </View>
                </View>
                {language === 'en' ? (
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={styles.emptyCircle} />
                )}
              </TouchableOpacity>

              {/* Amharic Option */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleSelectLanguage('am')}
                style={[
                  styles.optionRow,
                  language === 'am' && styles.optionRowActive,
                ]}>
                <View style={styles.optionLeft}>
                  <View style={[styles.flagBadge, language === 'am' && styles.flagBadgeActive]}>
                    <Text style={styles.flagText}>አማ</Text>
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.optionLabel,
                        language === 'am' && styles.optionLabelActive,
                      ]}>
                      አማርኛ (Amharic)
                    </Text>
                    <Text style={styles.optionSub}>ኢትዮጵያ</Text>
                  </View>
                </View>
                {language === 'am' ? (
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={styles.emptyCircle} />
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    borderRadius: Radius.pill,
    ...Shadows.sm,
  },
  pillCompact: {
    paddingHorizontal: 8,
    height: 38,
    gap: 4,
  },
  pillRegular: {
    paddingHorizontal: 12,
    height: 42,
    gap: 6,
  },
  globeIcon: {
    marginRight: 1,
  },
  pillText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  chevronIcon: {
    marginLeft: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  dropdownCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.lg,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  dropdownSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  optionsList: {
    gap: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  optionRowActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  flagBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagBadgeActive: {
    backgroundColor: Colors.primary,
  },
  flagText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.text,
  },
  optionLabel: {
    fontSize: Typography.fontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  optionLabelActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  optionSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
});
