import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, BottomTabInset, BorderRadius } from '@/constants/theme';
import { HeaderBar } from '@/components/ui/HeaderBar';
import { GlassCard } from '@/components/ui/GlassCard';
import { GradientBadge } from '@/components/ui/GradientBadge';
import { BinaryConvertModal } from '@/components/synapse/BinaryConvertModal';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function CanvasScreen() {
  const { isAuthenticated } = useAuth();
  const [canvas, setCanvas] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [convertingNote, setConvertingNote] = useState<any>(null);

  const loadCanvas = useCallback(async (force = false) => {
    try {
      const res = await api.getCanvas(undefined, force);
      if (res && res.data && res.data.canvas) {
        setCanvas(res.data.canvas);
      }
    } catch {
      // Offline fallback
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      loadCanvas().finally(() => setLoading(false));
    }
  }, [isAuthenticated, loadCanvas]);

  const onRefresh = async () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    await loadCanvas(true);
    setRefreshing(false);
  };

  // Inline action: Toggle Task Completion
  const handleToggleTask = async (task: any) => {
    const isNowCompleted = task.status !== 'completed';
    const nextStatus = isNowCompleted ? 'completed' : 'todo';

    // Optimistic local update
    setCanvas((prev: any) => {
      if (!prev || !prev.tasks) return prev;
      const updatedTasks = prev.tasks.today.map((t: any) =>
        t.id === task.id ? { ...t, status: nextStatus } : t
      );
      const completedCount = updatedTasks.filter((t: any) => t.status === 'completed').length;
      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          today: updatedTasks,
          completed_today: completedCount,
        },
      };
    });

    try {
      await api.updateTask(task.id, { status: nextStatus });
      await loadCanvas(true);
    } catch {
      await loadCanvas();
    }
  };

  // Inline action: Toggle Habit Check-in
  const handleToggleHabit = async (habit: any) => {
    const nextStatus = habit.is_completed_today ? 'skipped' : 'completed';

    // Optimistic local update
    setCanvas((prev: any) => {
      if (!prev || !prev.habits) return prev;
      const updatedHabits = prev.habits.today.map((h: any) =>
        h.id === habit.id
          ? {
              ...h,
              is_completed_today: !h.is_completed_today,
              current_streak:
                nextStatus === 'completed'
                  ? (h.current_streak || 0) + 1
                  : Math.max(0, (h.current_streak || 1) - 1),
            }
          : h
      );
      const completedCount = updatedHabits.filter((h: any) => h.is_completed_today).length;
      const rate = updatedHabits.length > 0 ? Math.round((completedCount / updatedHabits.length) * 100) : 0;
      return {
        ...prev,
        habits: {
          ...prev.habits,
          today: updatedHabits,
          completed_today: completedCount,
          completion_rate_percentage: rate,
        },
      };
    });

    try {
      await api.toggleHabit(habit.id, { status: nextStatus });
      await loadCanvas(true);
    } catch {
      await loadCanvas();
    }
  };

  const handleConvertNote = async (
    synapseId: string,
    payload: {
      title?: string;
      description?: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      due_date: string;
      due_time?: string | null;
      archive_note?: boolean;
    }
  ) => {
    await api.convertSynapse(synapseId, payload);
    setConvertingNote(null);
    await loadCanvas(true);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const todayDisplay = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const tasksToday = canvas?.tasks?.today || [];
  const habitsToday = canvas?.habits?.today || [];
  const pinnedSynapses = canvas?.synapse?.pinned || [];
  const overdueCount = canvas?.tasks?.overdue_count || 0;
  const todaySpent = canvas?.ledger?.today_spent || 0;
  const monthLimit = canvas?.ledger?.monthly_budget_limit || 0;
  const currency = canvas?.user?.currency_preference || 'USD';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.dark.canvas}
          />
        }>
        {/* Top Header Bar */}
        <HeaderBar
          title="The Daily Canvas"
          subtitle={todayDisplay}
          accentColor={Colors.dark.canvas}
          rightAction={{
            label: '⚡ Live Sync',
            onPress: onRefresh,
          }}
        />

        {/* Dynamic Focus Overview Card */}
        <GlassCard accentColor={Colors.dark.canvas} glow style={styles.focusCard}>
          <View style={styles.focusHeader}>
            <GradientBadge label="SYSTEM TIMELINE" color={Colors.dark.canvas} />
            <Text style={styles.cacheStatus}>
              {canvas?._cached ? '⚡ Cached (Sub-50ms)' : '🟢 Synchronized'}
            </Text>
          </View>

          <Text style={styles.greetingTitle}>
            {getGreeting()}, {canvas?.user?.display_name || 'Architect'}
          </Text>
          <Text style={styles.greetingSubtitle}>
            Your unified personal operating system is synchronized across 4 active subsystems.
          </Text>

          {/* Rapid Metrics Grid */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: Colors.dark.tasks }]}>
                {canvas?.tasks?.completed_today || 0}/{canvas?.tasks?.total_today || 0}
              </Text>
              <Text style={styles.metricLabel}>Tasks Done</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: Colors.dark.habits }]}>
                {canvas?.habits?.completion_rate_percentage || 0}%
              </Text>
              <Text style={styles.metricLabel}>Habit Rate</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: Colors.dark.ledger }]}>
                ${todaySpent.toFixed(2)}
              </Text>
              <Text style={styles.metricLabel}>Spent Today</Text>
            </View>
          </View>
        </GlassCard>

        {/* Overdue Tasks Alert Banner */}
        {overdueCount > 0 && (
          <GlassCard accentColor={Colors.dark.danger} glow style={styles.overdueCard}>
            <View style={styles.overdueRow}>
              <Text style={styles.overdueIcon}>⚠️</Text>
              <View style={styles.overdueTextContainer}>
                <Text style={styles.overdueTitle}>
                  {overdueCount} Overdue Task{overdueCount > 1 ? 's' : ''} Require Attention
                </Text>
                <Text style={styles.overdueSubtitle}>
                  Review your task engine to reschedule or complete past-due commitments.
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Interactive Habit Quick-Check Matrix Row */}
        {habitsToday.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🌿 Habit Matrix Quick-Check</Text>
              <GradientBadge
                label={`${canvas?.habits?.completed_today || 0}/${habitsToday.length} Done`}
                color={Colors.dark.habits}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.habitsCarousel}>
              {habitsToday.map((habit: any) => {
                const isCompleted = habit.is_completed_today;
                return (
                  <Pressable
                    key={habit.id}
                    onPress={() => handleToggleHabit(habit)}
                    style={({ pressed }) => [
                      styles.habitPill,
                      isCompleted
                        ? {
                            backgroundColor: `${habit.color_hex || Colors.dark.habits}25`,
                            borderColor: habit.color_hex || Colors.dark.habits,
                          }
                        : {
                            backgroundColor: Colors.dark.backgroundElement,
                            borderColor: Colors.dark.cardBorder,
                          },
                      pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                    ]}>
                    <View
                      style={[
                        styles.habitCheckCircle,
                        isCompleted && {
                          backgroundColor: habit.color_hex || Colors.dark.habits,
                          borderColor: habit.color_hex || Colors.dark.habits,
                        },
                      ]}>
                      {isCompleted && <Text style={styles.habitCheckmark}>✓</Text>}
                    </View>
                    <View style={styles.habitPillText}>
                      <Text style={styles.habitPillTitle} numberOfLines={1}>
                        {habit.title}
                      </Text>
                      <Text style={styles.habitPillStreak}>
                        🔥 {habit.current_streak || 0}d streak
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Section: Today's Actionable Task Timeline */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📋 Today's Action Timeline</Text>
            <GradientBadge
              label={`${tasksToday.filter((t: any) => t.status === 'completed').length}/${tasksToday.length} Completed`}
              color={Colors.dark.tasks}
            />
          </View>

          {tasksToday.length === 0 ? (
            <GlassCard style={styles.subsystemCard}>
              <Text style={styles.emptyCardText}>No scheduled tasks for today. You are all clear!</Text>
            </GlassCard>
          ) : (
            tasksToday.map((task: any) => {
              const isCompleted = task.status === 'completed';
              return (
                <GlassCard key={task.id} style={[styles.taskItemCard, isCompleted && styles.taskItemCompleted]}>
                  <View style={styles.taskItemRow}>
                    <Pressable
                      onPress={() => handleToggleTask(task)}
                      style={[
                        styles.taskCheckbox,
                        isCompleted && {
                          backgroundColor: Colors.dark.success,
                          borderColor: Colors.dark.success,
                        },
                      ]}>
                      {isCompleted && <Text style={styles.taskCheckmark}>✓</Text>}
                    </Pressable>

                    <View style={styles.taskItemContent}>
                      <Text
                        style={[styles.taskItemTitle, isCompleted && styles.taskItemTitleCompleted]}
                        numberOfLines={1}>
                        {task.title}
                      </Text>
                      {task.due_time && (
                        <Text style={styles.taskItemTime}>⏰ Due at {task.due_time}</Text>
                      )}
                    </View>

                    <GradientBadge
                      label={task.priority.toUpperCase()}
                      color={
                        task.priority === 'urgent'
                          ? Colors.dark.danger
                          : task.priority === 'high'
                          ? Colors.dark.warning
                          : Colors.dark.tasks
                      }
                      variant="subtle"
                    />
                  </View>
                </GlassCard>
              );
            })
          )}
        </View>

        {/* Section: Synapse Pinned Notes */}
        {pinnedSynapses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🧠 Synapse Pinned Streams</Text>
              <GradientBadge label="Markdown" color={Colors.dark.synapse} />
            </View>

            {pinnedSynapses.map((note: any) => (
              <GlassCard key={note.id} accentColor={Colors.dark.synapse} style={styles.pinnedCard}>
                <View style={styles.pinnedHeader}>
                  <Text style={styles.pinnedTitle} numberOfLines={1}>
                    {note.title}
                  </Text>
                  {!note.converted_to_task_id && (
                    <Pressable
                      onPress={() => setConvertingNote(note)}
                      style={styles.pinnedConvertBtn}>
                      <Text style={styles.pinnedConvertText}>⚡ Convert</Text>
                    </Pressable>
                  )}
                </View>
                {note.content ? (
                  <Text style={styles.pinnedContent} numberOfLines={2}>
                    {note.content}
                  </Text>
                ) : null}
              </GlassCard>
            ))}
          </View>
        )}

        {/* Section: Nano-Ledger Snapshot */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>💎 Nano-Ledger Snapshot</Text>
            <GradientBadge label={currency} color={Colors.dark.ledger} />
          </View>

          <GlassCard accentColor={Colors.dark.ledger} style={styles.ledgerSnapshotCard}>
            <View style={styles.ledgerSnapshotRow}>
              <View>
                <Text style={styles.ledgerSpentTitle}>Spent Today</Text>
                <Text style={styles.ledgerSpentAmount}>${todaySpent.toFixed(2)}</Text>
              </View>
              {monthLimit > 0 && (
                <View style={styles.ledgerBudgetBox}>
                  <Text style={styles.ledgerBudgetTitle}>Monthly Budget</Text>
                  <Text style={styles.ledgerBudgetAmount}>${monthLimit.toFixed(2)}</Text>
                </View>
              )}
            </View>
          </GlassCard>
        </View>
      </ScrollView>

      {/* Binary Convert Modal */}
      <BinaryConvertModal
        visible={!!convertingNote}
        onClose={() => setConvertingNote(null)}
        note={convertingNote}
        onConvert={handleConvertNote}
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
  focusCard: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  cacheStatus: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    fontWeight: '600',
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.dark.text,
    letterSpacing: -0.4,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.half,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.cardBorder,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 26,
    backgroundColor: Colors.dark.cardBorder,
  },
  overdueCard: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    borderColor: `${Colors.dark.danger}60`,
    backgroundColor: `${Colors.dark.danger}15`,
  },
  overdueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  overdueIcon: {
    fontSize: 22,
  },
  overdueTextContainer: {
    flex: 1,
  },
  overdueTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.danger,
  },
  overdueSubtitle: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  section: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  habitsCarousel: {
    flexDirection: 'row',
  },
  habitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginRight: Spacing.two,
    gap: Spacing.two,
  },
  habitCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: Colors.dark.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitCheckmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  habitPillText: {
    maxWidth: 120,
  },
  habitPillTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  habitPillStreak: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
    marginTop: 1,
  },
  subsystemCard: {
    backgroundColor: Colors.dark.backgroundElement,
  },
  emptyCardText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontStyle: 'italic',
  },
  taskItemCard: {
    marginBottom: Spacing.one + 2,
  },
  taskItemCompleted: {
    opacity: 0.6,
  },
  taskItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.dark.tasks,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  taskCheckmark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  taskItemContent: {
    flex: 1,
    marginRight: Spacing.two,
  },
  taskItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  taskItemTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.dark.textMuted,
  },
  taskItemTime: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  pinnedCard: {
    marginBottom: Spacing.two,
  },
  pinnedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  pinnedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark.text,
    flex: 1,
    marginRight: Spacing.two,
  },
  pinnedConvertBtn: {
    backgroundColor: `${Colors.dark.tasks}25`,
    borderColor: Colors.dark.tasks,
    borderWidth: 1,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  pinnedConvertText: {
    color: Colors.dark.tasks,
    fontSize: 11,
    fontWeight: '700',
  },
  pinnedContent: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    lineHeight: 16,
  },
  ledgerSnapshotCard: {
    backgroundColor: Colors.dark.backgroundElement,
  },
  ledgerSnapshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ledgerSpentTitle: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  ledgerSpentAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark.ledger,
    marginTop: 2,
  },
  ledgerBudgetBox: {
    alignItems: 'flex-end',
  },
  ledgerBudgetTitle: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
  ledgerBudgetAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.text,
    marginTop: 2,
  },
});
