import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '../../theme';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ visible, onClose, title, children }: ModalProps) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.contentWrapper}
            >
              <View style={styles.card}>
                {title ? (
                  <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                    <TouchableOpacity
                      onPress={onClose}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={styles.closeBtn}
                    >
                      <Ionicons name="close" size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ) : null}
                <View style={styles.body}>{children}</View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 440,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: Spacing.xs + 2,
  },
  title: {
    fontSize: Typography.fontSize.md + 1,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.round,
    backgroundColor: Colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    paddingTop: Spacing.xs,
  },
});

