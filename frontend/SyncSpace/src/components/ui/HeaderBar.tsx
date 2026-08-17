import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { UserProfileModal } from '@/components/auth/UserProfileModal';

interface HeaderBarProps {
  title: string;
  subtitle?: string;
  accentColor?: string;
  rightAction?: {
    icon?: React.ReactNode;
    label?: string;
    onPress: () => void;
  };
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title,
  subtitle,
  accentColor = Colors.dark.canvas,
  rightAction,
}) => {
  const { user } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.titleRow}>
          <View style={[styles.accentDot, { backgroundColor: accentColor }]} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.rightActionsRow}>
        {rightAction && (
          <Pressable
            onPress={rightAction.onPress}
            style={({ pressed }) => [
              styles.actionButton,
              { borderColor: `${accentColor}50` },
              pressed && { opacity: 0.7 },
            ]}>
            {rightAction.icon}
            {rightAction.label ? (
              <Text style={[styles.actionLabel, { color: accentColor }]}>
                {rightAction.label}
              </Text>
            ) : null}
          </Pressable>
        )}

        {user && (
          <Pressable
            onPress={() => setProfileOpen(true)}
            style={({ pressed }) => [
              styles.profileAvatar,
              pressed && { opacity: 0.7 },
            ]}>
            <Text style={styles.profileAvatarText}>{initials}</Text>
          </Pressable>
        )}
      </View>

      <UserProfileModal
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  left: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  accentDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.half,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    backgroundColor: Colors.dark.backgroundElement,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  profileAvatar: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1.5,
    borderColor: Colors.dark.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.dark.canvas,
  },
});
