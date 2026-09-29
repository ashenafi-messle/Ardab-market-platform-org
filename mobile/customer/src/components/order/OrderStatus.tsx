import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { OrderStatusType } from '@/types';
import { Colors, Radius, Typography, Spacing } from '@/theme';

export interface OrderStatusProps {
  status: OrderStatusType | string;
}

export const OrderStatus: React.FC<OrderStatusProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'DELIVERED':
        return {
          label: 'Delivered',
          bgColor: Colors.successLight || '#E8F5E9',
          textColor: Colors.success || '#2E7D32',
        };
      case 'SHIPPING':
      case 'IN_TRANSIT':
        return {
          label: 'Out for Delivery',
          bgColor: Colors.infoLight || '#E0F2FE',
          textColor: Colors.info || '#0284C7',
        };
      case 'PICKED_UP':
        return {
          label: 'Picked Up',
          bgColor: Colors.infoLight || '#E0F2FE',
          textColor: Colors.info || '#0284C7',
        };
      case 'ASSIGNED_TO_TRIP':
        return {
          label: 'Dispatched',
          bgColor: Colors.infoLight || '#E0F2FE',
          textColor: Colors.info || '#0284C7',
        };
      case 'READY_FOR_DELIVERY':
        return {
          label: 'Ready for Delivery',
          bgColor: '#FEF3C7',
          textColor: '#D97706',
        };
      case 'PROCESSING':
        return {
          label: 'Processing',
          bgColor: Colors.warningLight || '#FFFBEB',
          textColor: Colors.warning || '#D97706',
        };
      case 'CONFIRMED':
        return {
          label: 'Confirmed',
          bgColor: Colors.primaryLight || '#EEF2FF',
          textColor: Colors.primaryDark || '#4338CA',
        };
      case 'PENDING':
        return {
          label: 'Pending',
          bgColor: Colors.surfaceSubtle || '#F1F5F9',
          textColor: Colors.textSecondary || '#64748B',
        };
      case 'CANCELLED':
        return {
          label: 'Cancelled',
          bgColor: Colors.errorLight || '#FEE2E2',
          textColor: Colors.error || '#DC2626',
        };
      case 'FAILED':
        return {
          label: 'Failed',
          bgColor: Colors.errorLight || '#FEE2E2',
          textColor: Colors.error || '#DC2626',
        };
      case 'RETURNED':
        return {
          label: 'Returned',
          bgColor: '#F1F5F9',
          textColor: '#64748B',
        };
      case 'REJECTED':
        return {
          label: 'Rejected',
          bgColor: Colors.errorLight || '#FEE2E2',
          textColor: Colors.error || '#DC2626',
        };
      default:
        return {
          label: String(status || 'UNKNOWN'),
          bgColor: Colors.surfaceSubtle || '#F1F5F9',
          textColor: Colors.text || '#1E293B',
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
