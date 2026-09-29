import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing } from '@/theme';
import { OrderMilestone, OrderTimelineEvent, TrackingStep } from '@/types';

export interface OrderTimelineProps {
  milestones?: OrderMilestone[];
  timeline?: OrderTimelineEvent[];
  steps?: TrackingStep[];
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({
  milestones,
  timeline,
  steps,
}) => {
  // If milestones are provided (preferred backend format), render the structured milestone stages
  if (Array.isArray(milestones) && milestones.length > 0) {
    return (
      <View style={styles.container}>
        {milestones.map((item, index) => {
          const isLast = index === milestones.length - 1;
          const isCompleted = item.state === 'COMPLETED';
          const isCurrent = item.state === 'CURRENT';
          const isCancelled = item.state === 'CANCELLED' || item.state === 'FAILED';
          const isUpcoming = item.state === 'UPCOMING';

          return (
            <View key={item.key || index} style={styles.stepRow}>
              {/* Left indicator column */}
              <View style={styles.indicatorCol}>
                <View
                  style={[
                    styles.dot,
                    isCompleted && styles.dotCompleted,
                    isCurrent && styles.dotCurrent,
                    isCancelled && styles.dotCancelled,
                    isUpcoming && styles.dotUpcoming,
                  ]}>
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  ) : isCurrent ? (
                    <View style={styles.innerPulse} />
                  ) : isCancelled ? (
                    <Ionicons name="close" size={12} color="#FFFFFF" />
                  ) : (
                    <View style={styles.innerUpcomingDot} />
                  )}
                </View>
                {!isLast ? (
                  <View
                    style={[
                      styles.line,
                      isCompleted ? styles.lineCompleted : styles.linePending,
                    ]}
                  />
                ) : null}
              </View>

              {/* Right content column */}
              <View style={[styles.contentCol, !isLast && styles.contentColSpacing]}>
                <View style={styles.titleRow}>
                  <Text
                    style={[
                      styles.title,
                      isCurrent && styles.titleCurrent,
                      isCancelled && styles.titleCancelled,
                      isUpcoming && styles.titlePending,
                    ]}>
                    {item.title}
                  </Text>
                  {item.timestamp ? (
                    <Text style={styles.timestamp}>
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.description,
                    isUpcoming && styles.descPending,
                  ]}>
                  {item.description}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  // Fallback to legacy tracking steps array
  const activeSteps = steps || [];
  return (
    <View style={styles.container}>
      {activeSteps.map((step, index) => {
        const isLast = index === activeSteps.length - 1;

        return (
          <View key={index} style={styles.stepRow}>
            <View style={styles.indicatorCol}>
              <View
                style={[
                  styles.dot,
                  step.completed && styles.dotCompleted,
                  step.current && styles.dotCurrent,
                ]}>
                {step.completed ? (
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
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
    paddingVertical: Spacing.sm,
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
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dotCompleted: {
    backgroundColor: Colors.primary || '#16A34A',
  },
  dotCurrent: {
    backgroundColor: Colors.accent || '#F59E0B',
    borderWidth: 2,
    borderColor: Colors.primaryDark || '#15803D',
  },
  dotCancelled: {
    backgroundColor: Colors.error || '#DC2626',
  },
  dotUpcoming: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  innerPulse: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: '#FFFFFF',
  },
  innerUpcomingDot: {
    width: 4,
    height: 4,
    borderRadius: Radius.pill,
    backgroundColor: '#94A3B8',
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  lineCompleted: {
    backgroundColor: Colors.primary || '#16A34A',
  },
  linePending: {
    backgroundColor: '#E2E8F0',
  },
  contentCol: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  contentColSpacing: {
    paddingBottom: Spacing.lg,
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
  titleCancelled: {
    color: Colors.error,
    fontWeight: Typography.fontWeight.bold,
  },
  titlePending: {
    color: Colors.textMuted || '#94A3B8',
  },
  timestamp: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted || '#94A3B8',
  },
  description: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  descPending: {
    color: Colors.textMuted || '#94A3B8',
  },
});
