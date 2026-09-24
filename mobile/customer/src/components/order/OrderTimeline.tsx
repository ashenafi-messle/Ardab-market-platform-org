import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/theme';
import { TrackingStep } from '@/types';

export interface OrderTimelineProps {
  steps: TrackingStep[];
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ steps }) => {
  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <View key={index} style={styles.stepRow}>
            {/* Left timeline indicator */}
            <View style={styles.indicatorCol}>
              <View
                style={[
                  styles.dot,
                  step.completed && styles.dotCompleted,
                  step.current && styles.dotCurrent,
                ]}>
                {step.completed ? (
                  <Ionicons name="checkmark" size={12} color={Colors.textInverse} />
                ) : step.current ? (
                  <View style={styles.innerPulse} />
                ) : null}
              </View>
              {!isLast ? (
                <View
                  style={[
                    styles.line,
                    step.completed && styles.lineCompleted,
                  ]}
                />
              ) : null}
            </View>

            {/* Right content */}
            <View style={[styles.contentCol, !isLast && styles.contentColSpacing]}>
              <View style={styles.titleRow}>
                <Text
                  style={[
                    styles.title,
                    step.current && styles.titleCurrent,
                    !step.completed && !step.current && styles.titlePending,
                  ]}>
                  {step.title}
                </Text>
                {step.timestamp ? (
                  <Text style={styles.timestamp}>{step.timestamp}</Text>
                ) : null}
              </View>
              <Text
                style={[
                  styles.description,
                  !step.completed && !step.current && styles.descPending,
                ]}>
                {step.description}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
  },
  indicatorCol: {
    alignItems: 'center',
    width: 28,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  dotCompleted: {
    backgroundColor: Colors.primary,
  },
  dotCurrent: {
    backgroundColor: Colors.accent,
    borderWidth: 2,
    borderColor: Colors.primaryDark,
  },
  innerPulse: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryDark,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 4,
  },
  lineCompleted: {
    backgroundColor: Colors.primary,
  },
  contentCol: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  contentColSpacing: {
    paddingBottom: Spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text,
  },
  titleCurrent: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  titlePending: {
    color: Colors.textMuted,
  },
  timestamp: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
  },
  description: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  descPending: {
    color: Colors.textMuted,
  },
});
