import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBadge } from '@/components/ui/GradientBadge';
import { HeatmapMatrix, HeatmapLog } from './HeatmapMatrix';
import { api } from '@/services/api';

export interface HabitItem {
  id: string;
  user_id?: string;
  title: string;
  description?: string | null;
  category: string;
  color_hex: string;
  target_frequency_per_week: number;
  reminder_time?: string | null;
  is_archived?: boolean;
  is_completed_today: boolean;
  today_count: number;
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
}

interface HabitCardProps {
  habit: HabitItem;
  onToggle: (habit: HabitItem) => Promise<void>;
  onEdit: (habit: HabitItem) => void;
  onDelete: (id: string) => void;
}

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  onToggle,
  onEdit,
  onDelete,
}) => {
  const [heatmapLogs, setHeatmapLogs] = useState<HeatmapLog[]>([]);
  const [isHeatmapLoaded, setIsHeatmapLoaded] = useState(false);
  const [toggling, setToggling] = useState(false);

  const loadHeatmap = async () => {
    try {
      const res = await api.getHeatmap(habit.id);
      if (res && res.data && res.data.logs) {
        setHeatmapLogs(res.data.logs);
      }
      setIsHeatmapLoaded(true);
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    loadHeatmap();
  }, [habit.id, habit.is_completed_today]);

  const handleTogglePress = async () => {
    setToggling(true);
    try {
      await onToggle(habit);
    } finally {
      setToggling(false);
    }
  };

  return (
    <GlassCard accentColor={habit.color_hex} glow={habit.currentStreak >= 3} style={styles.card}>
      {/* Top Header Row */}
      <View style={styles.header}>
        <View style={styles.titleInfo}>
          <Text style={styles.title}>{habit.title}</Text>
          <View style={styles.metaRow}>
            <GradientBadge
              label={habit.category.toUpperCase()}
              color={habit.color_hex}
              variant="subtle"
            />
            <Text style={styles.frequencyText}>
              {habit.target_frequency_per_week}d / week
            </Text>
          </View>
        </View>

        {/* Streak Fire Badge */}
        <View style={[styles.streakBadge, { borderColor: habit.color_hex }]}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={[styles.streakCount, { color: habit.color_hex }]}>
            {habit.currentStreak}d
          </Text>
        </View>
      </View>

      {/* Description */}
      {habit.description ? (
        <Text style={styles.description}>{habit.description}</Text>
      ) : null}

      {/* 2D GitHub-Style Contribution Heatmap Matrix */}
      <View style={styles.matrixWrapper}>
        <HeatmapMatrix logs={heatmapLogs} color={habit.color_hex} weeksToShow={22} />
      </View>

      {/* Card Action Footer */}
      <View style={styles.footer}>
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => onEdit(habit)}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}>
            <Text style={styles.actionIcon}>✏️</Text>
          </Pressable>

          <Pressable
            onPress={() => onDelete(habit.id)}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}>
            <Text style={styles.actionIcon}>🗑️</Text>
          </Pressable>
        </View>

        {/* Tactile Check-In Button */}
        <Pressable
          onPress={handleTogglePress}
          disabled={toggling}
          style={({ pressed }) => [
            styles.checkinBtn,
            habit.is_completed_today
              ? { backgroundColor: habit.color_hex, borderColor: habit.color_hex }
              : { backgroundColor: 'transparent', borderColor: habit.color_hex },
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
          ]}>
          <Text
            style={[
              styles.checkinText,
              habit.is_completed_today ? { color: '#FFFFFF' } : { color: habit.color_hex },
            ]}>
            {habit.is_completed_today ? '✓ Completed Today' : '○ Check In for Today'}
          </Text>
        </Pressable>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  titleInfo: {
    flex: 1,
    marginRight: Spacing.three,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.dark.text,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  frequencyText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    fontWeight: '500',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    backgroundColor: Colors.dark.backgroundElement,
  },
  streakEmoji: {
    fontSize: 14,
  },
  streakCount: {
    fontSize: 13,
    fontWeight: '800',
  },
  description: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.two,
  },
  matrixWrapper: {
    marginVertical: Spacing.one,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.cardBorder,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  iconBtn: {
    padding: Spacing.one + 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.backgroundElement,
  },
  actionIcon: {
    fontSize: 13,
  },
  checkinBtn: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  checkinText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
