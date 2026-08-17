import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

export interface TaskItem {
  id: string;
  user_id?: string;
  synapse_id?: string | null;
  title: string;
  description?: string | null;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string | null;
  due_time?: string | null;
  recurrence_rule?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (taskData: {
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    due_date?: string | null;
    due_time?: string | null;
    recurrence_rule?: string | null;
  }) => Promise<void>;
  initialTask?: TaskItem | null;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialTask,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [recurrence, setRecurrence] = useState<string>('none');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title || '');
      setDescription(initialTask.description || '');
      setPriority(initialTask.priority || 'medium');
      setDueDate(initialTask.due_date || '');
      setDueTime(initialTask.due_time || '');
      setRecurrence(initialTask.recurrence_rule || 'none');
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate(new Date().toISOString().split('T')[0]);
      setDueTime('17:00');
      setRecurrence('none');
    }
  }, [initialTask, visible]);

  const setPresetDate = (daysFromToday: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    setDueDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: dueDate || null,
        due_time: dueTime || null,
        recurrence_rule: recurrence === 'none' ? null : recurrence,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {initialTask?.id ? 'Edit Task' : 'Schedule New Task'}
            </Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* Title */}
            <Text style={styles.label}>TASK TITLE</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Conduct Performance Stress Testing"
              placeholderTextColor={Colors.dark.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* Description */}
            <Text style={styles.label}>DESCRIPTION / CHECKLIST</Text>
            <TextInput
              style={[styles.input, styles.descInput]}
              placeholder="Additional context or requirements..."
              placeholderTextColor={Colors.dark.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />

            {/* Priority Selector */}
            <Text style={styles.label}>PRIORITY LEVEL</Text>
            <View style={styles.priorityRow}>
              {(
                [
                  { level: 'low', label: 'Low', color: Colors.dark.canvas },
                  { level: 'medium', label: 'Medium', color: Colors.dark.tasks },
                  { level: 'high', label: 'High', color: Colors.dark.warning },
                  { level: 'urgent', label: 'Urgent', color: Colors.dark.danger },
                ] as const
              ).map((p) => {
                const isSelected = priority === p.level;
                return (
                  <Pressable
                    key={p.level}
                    onPress={() => setPriority(p.level)}
                    style={[
                      styles.priorityBtn,
                      isSelected && {
                        backgroundColor: `${p.color}30`,
                        borderColor: p.color,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.priorityText,
                        { color: isSelected ? p.color : Colors.dark.textSecondary },
                      ]}>
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Due Date & Presets */}
            <Text style={styles.label}>DUE DATE</Text>
            <View style={styles.datePresetsRow}>
              <Pressable
                style={[styles.datePresetBtn, dueDate === todayStr && styles.datePresetActive]}
                onPress={() => setPresetDate(0)}>
                <Text style={[styles.datePresetText, dueDate === todayStr && styles.datePresetTextActive]}>
                  Today
                </Text>
              </Pressable>
              <Pressable
                style={styles.datePresetBtn}
                onPress={() => setPresetDate(1)}>
                <Text style={styles.datePresetText}>Tomorrow</Text>
              </Pressable>
              <Pressable
                style={styles.datePresetBtn}
                onPress={() => setPresetDate(3)}>
                <Text style={styles.datePresetText}>In 3 Days</Text>
              </Pressable>
              <Pressable
                style={styles.datePresetBtn}
                onPress={() => setPresetDate(7)}>
                <Text style={styles.datePresetText}>Next Week</Text>
              </Pressable>
            </View>

            <View style={styles.dateTimeRow}>
              <View style={styles.dateField}>
                <Text style={styles.subLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={dueDate}
                  onChangeText={setDueDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.dark.textMuted}
                />
              </View>
              <View style={styles.timeField}>
                <Text style={styles.subLabel}>Time (HH:MM)</Text>
                <TextInput
                  style={styles.input}
                  value={dueTime}
                  onChangeText={setDueTime}
                  placeholder="17:00"
                  placeholderTextColor={Colors.dark.textMuted}
                />
              </View>
            </View>

            {/* Recurrence Rule */}
            <Text style={styles.label}>RECURRENCE</Text>
            <View style={styles.recurrenceRow}>
              {['none', 'daily', 'weekly', 'monthly'].map((r) => {
                const isSelected = recurrence === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setRecurrence(r)}
                    style={[
                      styles.recurrenceBtn,
                      isSelected && {
                        backgroundColor: `${Colors.dark.tasks}25`,
                        borderColor: Colors.dark.tasks,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.recurrenceText,
                        isSelected && { color: Colors.dark.tasks, fontWeight: '700' },
                      ]}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.saveBtn,
                (!title.trim() || submitting) && styles.disabledBtn,
              ]}
              onPress={handleSubmit}
              disabled={!title.trim() || submitting}>
              <Text style={styles.saveText}>{submitting ? 'Saving...' : 'Save Task'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    maxHeight: '90%',
    paddingBottom: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.dark.text,
  },
  closeBtn: {
    padding: Spacing.one,
  },
  closeText: {
    fontSize: 18,
    color: Colors.dark.textSecondary,
  },
  body: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.one,
    marginTop: Spacing.three,
    letterSpacing: 0.5,
  },
  subLabel: {
    fontSize: 11,
    color: Colors.dark.textMuted,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    color: Colors.dark.text,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  descInput: {
    height: 70,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.backgroundElement,
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  datePresetsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  datePresetBtn: {
    flex: 1,
    paddingVertical: Spacing.one + 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    alignItems: 'center',
  },
  datePresetActive: {
    backgroundColor: `${Colors.dark.tasks}25`,
    borderColor: Colors.dark.tasks,
  },
  datePresetText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  datePresetTextActive: {
    color: Colors.dark.tasks,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  dateField: {
    flex: 3,
  },
  timeField: {
    flex: 2,
  },
  recurrenceRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  recurrenceBtn: {
    flex: 1,
    paddingVertical: Spacing.one + 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    alignItems: 'center',
  },
  recurrenceText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.cardBorder,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.backgroundElement,
    alignItems: 'center',
  },
  cancelText: {
    color: Colors.dark.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: Spacing.three,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.tasks,
    alignItems: 'center',
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
