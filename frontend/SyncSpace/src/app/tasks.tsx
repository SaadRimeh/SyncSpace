import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
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
import { CreateTaskModal, TaskItem } from '@/components/tasks/CreateTaskModal';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function TasksScreen() {
  const { isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<'today' | 'upcoming' | 'completed'>('today');
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadTasks = useCallback(async () => {
    try {
      const params: Record<string, any> = {};
      if (selectedTab === 'today') {
        params.due_date = todayStr;
        params.status = 'todo,in_progress';
      } else if (selectedTab === 'completed') {
        params.status = 'completed';
      } else if (selectedTab === 'upcoming') {
        params.status = 'todo,in_progress';
      }

      if (selectedPriority) params.priority = selectedPriority;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [taskRes, statsRes] = await Promise.all([
        api.getTasks(params),
        api.getTaskSummary(),
      ]);

      if (taskRes?.data?.tasks) setTasks(taskRes.data.tasks);
      if (statsRes?.data?.stats) setStats(statsRes.data.stats);
    } catch {
      // Fallback
    }
  }, [selectedTab, selectedPriority, searchQuery, todayStr]);

  // Initial load when auth becomes available
  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      loadTasks().finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Silent refresh when filters/search change (no spinner)
  useEffect(() => {
    if (isAuthenticated) {
      loadTasks();
    }
  }, [isAuthenticated, loadTasks]);

  const onRefresh = async () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const handleToggleComplete = async (task: TaskItem) => {
    const isNowCompleted = task.status !== 'completed';
    const nextStatus = isNowCompleted ? 'completed' : 'todo';

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    try {
      await api.updateTask(task.id, { status: nextStatus });
      await loadTasks();
    } catch {
      await loadTasks();
    }
  };

  const handleSaveTask = async (taskData: any) => {
    try {
      if (editingTask) {
        await api.updateTask(editingTask.id, taskData);
      } else {
        await api.createTask(taskData);
        // Switch to upcoming tab so the new task is immediately visible
        // (the 'today' filter only shows tasks with due_date = today)
        setSelectedTab('upcoming');
      }
    } catch {
      // Handled silently
    } finally {
      setEditingTask(null);
      setIsCreateModalOpen(false);
      await loadTasks();
    }
  };

  const handleDeleteTask = async (id: string) => {
    await api.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await loadTasks();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return Colors.dark.danger;
      case 'high':
        return Colors.dark.warning;
      case 'medium':
        return Colors.dark.tasks;
      default:
        return Colors.dark.canvas;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.dark.tasks}
          />
        }>
        {/* Header */}
        <HeaderBar
          title="Task Engine"
          subtitle="Priority Scheduling & Timeline"
          accentColor={Colors.dark.tasks}
          rightAction={{
            label: '+ Task',
            onPress: () => {
              setEditingTask(null);
              setIsCreateModalOpen(true);
            },
          }}
        />

        {/* Task Summary Banner */}
        <GlassCard accentColor={Colors.dark.tasks} style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: Colors.dark.tasks }]}>
                {stats?.today_count || 0}
              </Text>
              <Text style={styles.summaryLabel}>Due Today</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: Colors.dark.warning }]}>
                {stats?.in_progress || 0}
              </Text>
              <Text style={styles.summaryLabel}>In Progress</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: Colors.dark.danger }]}>
                {stats?.overdue || 0}
              </Text>
              <Text style={styles.summaryLabel}>Overdue</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: Colors.dark.success }]}>
                {stats?.completed || 0}
              </Text>
              <Text style={styles.summaryLabel}>Completed</Text>
            </View>
          </View>
        </GlassCard>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Search tasks..."
            placeholderTextColor={Colors.dark.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabFiltersRow}>
          {(['today', 'upcoming', 'completed'] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setSelectedTab(tab)}
              style={[
                styles.tabFilterBtn,
                selectedTab === tab && {
                  backgroundColor: `${Colors.dark.tasks}25`,
                  borderColor: Colors.dark.tasks,
                },
              ]}>
              <Text
                style={[
                  styles.tabFilterText,
                  { color: selectedTab === tab ? Colors.dark.tasks : Colors.dark.textSecondary },
                ]}>
                {tab.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Priority Filter Chips */}
        <View style={styles.priorityChipsRow}>
          <Pressable onPress={() => setSelectedPriority(null)}>
            <GradientBadge
              label="All Priorities"
              color={selectedPriority === null ? Colors.dark.tasks : Colors.dark.textSecondary}
              variant={selectedPriority === null ? 'solid' : 'outline'}
            />
          </Pressable>
          {(['urgent', 'high', 'medium', 'low'] as const).map((p) => (
            <Pressable key={p} onPress={() => setSelectedPriority(selectedPriority === p ? null : p)}>
              <GradientBadge
                label={p.toUpperCase()}
                color={getPriorityColor(p)}
                variant={selectedPriority === p ? 'solid' : 'outline'}
              />
            </Pressable>
          ))}
        </View>

        {/* Task List */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.dark.tasks} />
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Tasks Found</Text>
            <Text style={styles.emptySubtitle}>
              {selectedTab === 'today'
                ? 'All clear for today! Schedule a new task or convert a Synapse note.'
                : 'No tasks matching the selected filters.'}
            </Text>
            <Pressable
              style={styles.emptyBtn}
              onPress={() => {
                setEditingTask(null);
                setIsCreateModalOpen(true);
              }}>
              <Text style={styles.emptyBtnText}>+ Schedule Task</Text>
            </Pressable>
          </View>
        ) : (
          tasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const priorityColor = getPriorityColor(task.priority);

            return (
              <GlassCard
                key={task.id}
                accentColor={task.priority === 'urgent' ? Colors.dark.danger : undefined}
                style={[styles.taskCard, isCompleted && styles.taskCardCompleted]}>
                <View style={styles.taskRow}>
                  {/* Interactive Checkbox */}
                  <Pressable
                    onPress={() => handleToggleComplete(task)}
                    style={[
                      styles.checkbox,
                      { borderColor: isCompleted ? Colors.dark.success : priorityColor },
                      isCompleted && { backgroundColor: Colors.dark.success },
                    ]}>
                    {isCompleted && <Text style={styles.checkmark}>✓</Text>}
                  </Pressable>

                  {/* Task Content */}
                  <View style={styles.taskContent}>
                    <Text
                      style={[styles.taskTitle, isCompleted && styles.taskTitleCompleted]}>
                      {task.title}
                    </Text>
                    {task.description ? (
                      <Text style={styles.taskDesc} numberOfLines={2}>
                        {task.description}
                      </Text>
                    ) : null}
                    <View style={styles.taskMetaRow}>
                      {task.due_date && (
                        <Text style={styles.taskDueText}>
                          📅 {task.due_date} {task.due_time ? `@ ${task.due_time}` : ''}
                        </Text>
                      )}
                      {task.recurrence_rule && (
                        <Text style={styles.recurrenceBadge}>
                          🔄 {task.recurrence_rule}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Priority & Actions */}
                  <View style={styles.taskRight}>
                    <GradientBadge
                      label={task.priority.toUpperCase()}
                      color={priorityColor}
                      variant="subtle"
                    />
                    <View style={styles.taskActionsRow}>
                      <Pressable
                        onPress={() => {
                          setEditingTask(task);
                          setIsCreateModalOpen(true);
                        }}
                        style={styles.actionBtn}>
                        <Text style={styles.actionIcon}>✏️</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteTask(task.id)}
                        style={styles.actionBtn}>
                        <Text style={styles.actionIcon}>🗑️</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </GlassCard>
            );
          })
        )}
      </ScrollView>

      {/* Create / Edit Task Modal */}
      <CreateTaskModal
        visible={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleSaveTask}
        initialTask={editingTask}
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
  summaryCard: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.dark.cardBorder,
  },
  searchContainer: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.two,
  },
  searchInput: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    color: Colors.dark.text,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
  },
  tabFiltersRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.two,
  },
  tabFilterBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.backgroundElement,
  },
  tabFilterText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priorityChipsRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    flexWrap: 'wrap',
  },
  taskCard: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two + 2,
  },
  taskCardCompleted: {
    opacity: 0.6,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
    marginTop: 2,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.dark.textMuted,
  },
  taskDesc: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  taskDueText: {
    fontSize: 11,
    color: Colors.dark.textSecondary,
  },
  recurrenceBadge: {
    fontSize: 11,
    color: Colors.dark.tasks,
  },
  taskRight: {
    alignItems: 'flex-end',
    marginLeft: Spacing.two,
  },
  taskActionsRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  actionBtn: {
    padding: 2,
  },
  actionIcon: {
    fontSize: 13,
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
    backgroundColor: Colors.dark.tasks,
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
