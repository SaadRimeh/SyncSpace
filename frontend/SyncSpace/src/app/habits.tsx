import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, BottomTabInset, BorderRadius } from '@/constants/theme';
import { HeaderBar } from '@/components/ui/HeaderBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBadge } from '@/components/ui/GradientBadge';
import { HabitCard, HabitItem } from '@/components/habits/HabitCard';
import { CreateHabitModal } from '@/components/habits/CreateHabitModal';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function HabitsScreen() {
  const { isAuthenticated } = useAuth();
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitItem | null>(null);

  const loadHabits = useCallback(async () => {
    try {
      const res = await api.getHabits();
      if (res && res.data && res.data.habits) {
        setHabits(res.data.habits);
      }
    } catch {
      // Offline fallback
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      loadHabits().finally(() => setLoading(false));
    }
  }, [isAuthenticated, loadHabits]);

  const onRefresh = async () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    await loadHabits();
    setRefreshing(false);
  };

  const handleToggleHabit = async (habit: HabitItem) => {
    const nextStatus = habit.is_completed_today ? 'skipped' : 'completed';
    // Optimistic update
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habit.id
          ? {
              ...h,
              is_completed_today: !h.is_completed_today,
              currentStreak: nextStatus === 'completed' ? h.currentStreak + 1 : Math.max(0, h.currentStreak - 1),
            }
          : h
      )
    );

    try {
      await api.toggleHabit(habit.id, { status: nextStatus });
      await loadHabits();
    } catch {
      await loadHabits();
    }
  };

  const handleSaveHabit = async (habitData: {
    title: string;
    description?: string;
    category: string;
    color_hex: string;
    target_frequency_per_week: number;
    reminder_time?: string | null;
  }) => {
    if (editingHabit) {
      await api.updateHabit(editingHabit.id, habitData);
    } else {
      await api.createHabit(habitData);
    }
    setEditingHabit(null);
    await loadHabits();
  };

  const handleDeleteHabit = async (id: string) => {
    await api.deleteHabit(id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  // Metrics summary calculations
  const totalHabits = habits.length;
  const completedToday = habits.filter((h) => h.is_completed_today).length;
  const completionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.longestStreak || h.currentStreak || 0), 0);

  const categories = Array.from(new Set(habits.map((h) => h.category)));
  const filteredHabits = selectedCategory
    ? habits.filter((h) => h.category === selectedCategory)
    : habits;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.dark.habits}
          />
        }>
        {/* Header */}
        <HeaderBar
          title="Habit Matrix"
          subtitle="2D Contribution Heatmap & Streaks"
          accentColor={Colors.dark.habits}
          rightAction={{
            label: '+ Habit',
            onPress: () => {
              setEditingHabit(null);
              setIsCreateModalOpen(true);
            },
          }}
        />

        {/* Global Streak & Matrix Metrics Card */}
        <GlassCard accentColor={Colors.dark.habits} glow style={styles.metricsCard}>
          <View style={styles.metricsHeader}>
            <GradientBadge label="DAILY CHECK-IN MATRIX" color={Colors.dark.habits} />
            <Text style={styles.completionText}>{completionRate}% Completed Today</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${completionRate}%` }]} />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{completedToday}/{totalHabits}</Text>
              <Text style={styles.statLabel}>Checked In</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: Colors.dark.habits }]}>
                🔥 {bestStreak}d
              </Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{totalHabits}</Text>
              <Text style={styles.statLabel}>Active Habits</Text>
            </View>
          </View>
        </GlassCard>

        {/* Category Filters */}
        {categories.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilterRow}>
            <Pressable onPress={() => setSelectedCategory(null)}>
              <GradientBadge
                label="All Categories"
                color={selectedCategory === null ? Colors.dark.habits : Colors.dark.textSecondary}
                variant={selectedCategory === null ? 'solid' : 'outline'}
              />
            </Pressable>
            {categories.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}>
                <GradientBadge
                  label={cat.toUpperCase()}
                  color={selectedCategory === cat ? Colors.dark.habits : Colors.dark.textSecondary}
                  variant={selectedCategory === cat ? 'solid' : 'outline'}
                />
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Habits List */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.dark.habits} />
          </View>
        ) : filteredHabits.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🌿</Text>
            <Text style={styles.emptyTitle}>No Habits Configured</Text>
            <Text style={styles.emptySubtitle}>
              Create daily habits to track your streaks and visual contribution heatmap.
            </Text>
            <Pressable
              style={styles.emptyBtn}
              onPress={() => {
                setEditingHabit(null);
                setIsCreateModalOpen(true);
              }}>
              <Text style={styles.emptyBtnText}>+ Create Habit</Text>
            </Pressable>
          </View>
        ) : (
          filteredHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              onToggle={handleToggleHabit}
              onEdit={(h) => {
                setEditingHabit(h);
                setIsCreateModalOpen(true);
              }}
              onDelete={handleDeleteHabit}
            />
          ))
        )}
      </ScrollView>

      {/* Create / Edit Habit Modal */}
      <CreateHabitModal
        visible={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingHabit(null);
        }}
        onSubmit={handleSaveHabit}
        initialHabit={editingHabit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContainer: {
    paddingBottom: BottomTabInset + Spacing.six,
  },
  metricsCard: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.four,
  },
  metricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  completionText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.dark.habits,
  },
  progressBarBg: {
    height: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.backgroundElement,
    overflow: 'hidden',
    marginBottom: Spacing.three,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.dark.habits,
    borderRadius: BorderRadius.full,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.dark.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.dark.cardBorder,
  },
  categoryFilterRow: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  loadingContainer: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.two,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: Spacing.one,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.four,
  },
  emptyBtn: {
    backgroundColor: Colors.dark.habits,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.full,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
