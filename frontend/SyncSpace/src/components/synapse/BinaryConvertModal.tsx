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
import { GradientBadge } from '@/components/ui/GradientBadge';

interface BinaryConvertModalProps {
  visible: boolean;
  onClose: () => void;
  note: {
    id: string;
    title: string;
    content: string;
  } | null;
  onConvert: (synapseId: string, payload: {
    title?: string;
    description?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    due_date: string;
    due_time?: string | null;
    archive_note?: boolean;
  }) => Promise<void>;
}

export const BinaryConvertModal: React.FC<BinaryConvertModalProps> = ({
  visible,
  onClose,
  note,
  onConvert,
}) => {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('12:00');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [archiveNote, setArchiveNote] = useState(true);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (note) {
      setTaskTitle(note.title || '');
      setTaskDesc(note.content || '');
      setDueDate(new Date().toISOString().split('T')[0]);
      setDueTime('12:00');
      setPriority('medium');
      setArchiveNote(true);
    }
  }, [note, visible]);

  const setPresetDate = (daysFromToday: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    setDueDate(d.toISOString().split('T')[0]);
  };

  const handleConvert = async () => {
    if (!note || !dueDate) return;
    setConverting(true);
    try {
      await onConvert(note.id, {
        title: taskTitle.trim() || note.title,
        description: taskDesc.trim() || note.content,
        priority,
        due_date: dueDate,
        due_time: dueTime || null,
        archive_note: archiveNote,
      });
      onClose();
    } finally {
      setConverting(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerIcon}>⚡</Text>
              <Text style={styles.headerTitle}>Atomic Binary Conversion</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.subtitle}>
              Transform this raw markdown thought into an actionable scheduled task in the Task Engine.
            </Text>

            {/* Task Title */}
            <Text style={styles.label}>SCHEDULED TASK TITLE</Text>
            <TextInput
              style={styles.input}
              value={taskTitle}
              onChangeText={setTaskTitle}
              placeholder="Task Title"
              placeholderTextColor={Colors.dark.textMuted}
            />

            {/* Quick Due Date Presets */}
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
                  placeholder="12:00"
                  placeholderTextColor={Colors.dark.textMuted}
                />
              </View>
            </View>

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

            {/* Archive Original Note Option */}
            <Pressable
              style={styles.archiveRow}
              onPress={() => setArchiveNote(!archiveNote)}>
              <View
                style={[
                  styles.checkbox,
                  archiveNote && { backgroundColor: Colors.dark.tasks, borderColor: Colors.dark.tasks },
                ]}>
                {archiveNote && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.archiveLabel}>Archive original Synapse note after conversion</Text>
            </Pressable>
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.convertBtn, converting && styles.disabledBtn]}
              onPress={handleConvert}
              disabled={converting || !dueDate}>
              <Text style={styles.convertText}>
                {converting ? 'Converting...' : '⚡ Convert to Task'}
              </Text>
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
    borderColor: `${Colors.dark.tasks}50`,
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerIcon: {
    fontSize: 20,
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
    paddingTop: Spacing.three,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.three,
    lineHeight: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.one,
    marginTop: Spacing.two,
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
  archiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.dark.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  archiveLabel: {
    fontSize: 13,
    color: Colors.dark.text,
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
  convertBtn: {
    flex: 2,
    paddingVertical: Spacing.three,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.tasks,
    alignItems: 'center',
  },
  convertText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
