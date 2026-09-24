import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Typography, Spacing, Shadows } from '@/theme';
import { UserProfile } from '@/types';

export interface ProfileHeaderProps {
  user: UserProfile | null;
  onEditPress?: () => void;
  onLoginPress?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  onEditPress,
  onLoginPress,
}) => {
  if (!user) {
    return (
      <View style={styles.card}>
        <View style={styles.guestAvatar}>
          <Ionicons name="person-outline" size={32} color={Colors.primary} />
        </View>
        <View style={styles.guestInfo}>
          <Text style={styles.guestTitle}>Welcome to Ardab Market</Text>
          <Text style={styles.guestSubtitle}>Sign in to view orders, wishlist & addresses</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onLoginPress}
            style={styles.loginBtn}>
            <Text style={styles.loginBtnText}>Sign In / Register</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.avatarContainer}>
        {user.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} resizeMode="cover" />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>
              {user.fullName.slice(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
        {user.verified ? (
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={12} color={Colors.textInverse} />
          </View>
        ) : null}
      </View>

      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.userName} numberOfLines={1}>
            {user.fullName}
          </Text>
          {onEditPress ? (
            <TouchableOpacity
              onPress={onEditPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.editBtn}>
              <Ionicons name="pencil" size={14} color={Colors.primary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.userEmail} numberOfLines={1}>
          {user.email}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.locationTag}>
            <Ionicons name="location-outline" size={12} color={Colors.primary} />
            <Text style={styles.locationText}>{user.city}</Text>
          </View>
          <Text style={styles.joinedText}>Member since {user.joinedDate}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primaryDark,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    padding: 3,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  editBtn: {
    padding: 4,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.pill,
  },
  userEmail: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 6,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    gap: 2,
  },
  locationText: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.primaryDark,
    fontWeight: Typography.fontWeight.semibold,
  },
  joinedText: {
    fontSize: Typography.fontSize.tiny,
    color: Colors.textMuted,
  },

  // Guest view
  guestAvatar: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  guestTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
  guestSubtitle: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.xs,
  },
  loginBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    marginTop: 4,
  },
  loginBtnText: {
    color: Colors.textInverse,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
});
