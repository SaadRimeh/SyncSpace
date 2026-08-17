import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

interface UserProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  visible,
  onClose,
}) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const initials = user.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>User Profile</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.content}>
            {/* Avatar & Name */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
              <Text style={styles.userName}>{user.full_name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>

            {/* Account Details */}
            <View style={styles.detailsGroup}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>User ID</Text>
                <Text style={styles.detailValueMono} numberOfLines={1}>
                  {user.id}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Timezone</Text>
                <Text style={styles.detailValue}>{user.timezone || 'UTC'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Currency</Text>
                <Text style={styles.detailValue}>{user.currency || 'USD'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Security</Text>
                <Text style={[styles.detailValue, { color: Colors.dark.success }]}>
                  ● Argon2id Protected
                </Text>
              </View>
            </View>

            {/* Logout Action */}
            <Pressable
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && { opacity: 0.8 },
              ]}
              onPress={handleLogout}>
              <Text style={styles.logoutText}>Sign Out of SyncSpace</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
  },
  content: {
    maxHeight: 480,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: Spacing.two,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderWidth: 2,
    borderColor: Colors.dark.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.dark.canvas,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.half,
  },
  detailsGroup: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    marginVertical: Spacing.three,
    gap: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textMuted,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  detailValueMono: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: Colors.dark.textSecondary,
    maxWidth: 200,
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
});
