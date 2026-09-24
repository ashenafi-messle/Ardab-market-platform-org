import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OrderStatusType } from '@/types';
import { Colors, Radius, Typography, Spacing } from '@/theme';
import { t } from '@/localization';

export interface OrderStatusProps {
  status: OrderStatusType;
}

export const OrderStatus: React.FC<OrderStatusProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'DELIVERED':
        return {
          label: t('orders.statusDelivered'),
          bgColor: Colors.successLight,
          textColor: Colors.success,
        };
      case 'SHIPPING':
        return {
          label: t('orders.statusShipped'),
          bgColor: Colors.infoLight,
          textColor: Colors.info,
        };
      case 'PROCESSING':
        return {
          label: t('orders.statusProcessing'),
          bgColor: Colors.warningLight,
          textColor: Colors.warning,
        };
      case 'CONFIRMED':
        return {
          label: t('orders.statusConfirmed'),
          bgColor: Colors.primaryLight,
          textColor: Colors.primaryDark,
        };
      case 'PENDING':
        return {
          label: t('orders.statusPending'),
          bgColor: Colors.surfaceSubtle,
          textColor: Colors.textSecondary,
        };
      case 'CANCELLED':
        return {
          label: t('orders.statusCancelled'),
          bgColor: Colors.errorLight,
          textColor: Colors.error,
        };
      default:
        return {
          label: status,
          bgColor: Colors.surfaceSubtle,
          textColor: Colors.text,
        };
    }
  };

  const { label, bgColor, textColor } = getStatusConfig();

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: Typography.fontSize.tiny,
    fontWeight: Typography.fontWeight.bold,
  },
});
