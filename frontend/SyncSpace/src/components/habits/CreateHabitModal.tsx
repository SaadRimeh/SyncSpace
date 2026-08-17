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

interface CreateHabitModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (habitData: {
    title: string;
    description?: string;
    category: string;
    color_hex: string;
    target_frequency_per_week: number;
    reminder_time?: string | null;
  }) => Promise<void>;
  initialHabit?: {
    id?: string;
    title: string;
    description?: string | null;
    category?: string;
    color_hex?: string;
    target_frequency_per_week?: number;
    reminder_time?: string | null;
  } | null;
}

const CATEGORIES = [
  { id: 'fitness', label: 'Fitness', icon: '💪' },
  { id: 'health', label: 'Health', icon: '🥗' },
  { id: 'productivity', label: 'Productivity', icon: '⚡' },
  { id: 'mindfulness', label: 'Mindfulness', icon: '🧘' },
  { id: 'learning', label: 'Learning', icon: '📚' },
  { id: 'general', label: 'General', icon: '🎯' },
];

const COLOR_PRESETS = [
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#8B5CF6', // Violet
  '#F59E0B', // Amber
  '#EC4899', // Rose
  '#3B82F6', // Blue
];

export const CreateHabitModal: React.FC<CreateHabitModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialHabit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('fitness');
  const [colorHex, setColorHex] = useState('#10B981');
  const [frequency, setFrequency] = useState(7);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialHabit) {
      setTitle(initialHabit.title || '');
      setDescription(initialHabit.description || '');
      setCategory(initialHabit.category || 'fitness');
      setColorHex(initialHabit.color_hex || '#10B981');
      setFrequency(initialHabit.target_frequency_per_week || 7);
      setReminderTime(initialHabit.reminder_time || '08:00');
    } else {
      setTitle('');
      setDescription('');
      setCategory('fitness');
      setColorHex('#10B981');
      setFrequency(7);
      setReminderTime('08:00');
    }
  }, [initialHabit, visible]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        color_hex: colorHex,
        target_frequency_per_week: frequency,
        reminder_time: reminderTime || null,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {initialHabit?.id ? 'Edit Habit Matrix' : 'Create New Habit'}
            </Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* Title */}
            <Text style={styles.label}>HABIT TITLE</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Morning 45-min Workout"
              placeholderTextColor={Colors.dark.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* Description */}
            <Text style={styles.label}>DESCRIPTION / MOTIVATION</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Cardio and core strength routine"
              placeholderTextColor={Colors.dark.textMuted}
              value={description}
              onChangeText={setDescription}
            />

            {/* Category Selector */}
            <Text style={styles.label}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setCategory(cat.id)}
                    style={[
                      styles.categoryChip,
                      isSelected && {
                        backgroundColor: `${colorHex}30`,
                        borderColor: colorHex,
                      },
                    ]}>
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text
                      style={[
                        styles.categoryLabel,
                        isSelected && { color: colorHex, fontWeight: '700' },
                      ]}>
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Color Palette */}
            <Text style={styles.label}>HEATMAP THEME COLOR</Text>
            <View style={styles.colorRow}>
              {COLOR_PRESETS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColorHex(c)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    colorHex === c && styles.colorCircleSelected,
                  ]}>
                  {colorHex === c && <Text style={styles.colorCheck}>✓</Text>}
                </Pressable>
              ))}
            </View>

            {/* Frequency Selector */}
            <Text style={styles.label}>TARGET WEEKLY FREQUENCY</Text>
            <View style={styles.frequencyRow}>
              {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                const isSelected = frequency === num;
                return (
                  <Pressable
                    key={num}
                    onPress={() => setFrequency(num)}
                    style={[
                      styles.frequencyBtn,
                      isSelected && {
                        backgroundColor: `${colorHex}25`,
                        borderColor: colorHex,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.frequencyText,
                        isSelected && { color: colorHex, fontWeight: '800' },
                      ]}>
                      {num}d
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Reminder Time */}
            <Text style={styles.label}>DAILY REMINDER (HH:MM)</Text>
            <TextInput
              style={styles.input}
              placeholder="08:00"
              placeholderTextColor={Colors.dark.textMuted}
              value={reminderTime}
              onChangeText={setReminderTime}
            />
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.saveBtn,
                { backgroundColor: colorHex },
                (!title.trim() || submitting) && styles.disabledBtn,
              ]}
              onPress={handleSubmit}
              disabled={!title.trim() || submitting}>
              <Text style={styles.saveText}>{submitting ? 'Saving...' : 'Save Habit'}</Text>
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
  categoryRow: {
    flexDirection: 'row',
    marginBottom: Spacing.one,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.backgroundElement,
    marginRight: Spacing.two,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryLabel: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontWeight: '500',
  },
  colorRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginVertical: Spacing.one,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  colorCheck: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: Spacing.one + 2,
  },
  frequencyBtn: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    alignItems: 'center',
  },
  frequencyText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontWeight: '600',
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
