import React, { useState } from 'react';
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
import { CategoryItem } from './RecordTransactionModal';

interface ManageCategoriesModalProps {
  visible: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  onCreateCategory: (catData: {
    name: string;
    type: 'income' | 'expense';
    color_hex: string;
    icon_name: string;
    monthly_budget_limit: number;
  }) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

const COLOR_PRESETS = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4'];

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  visible,
  onClose,
  categories,
  onCreateCategory,
  onDeleteCategory,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [colorHex, setColorHex] = useState('#3B82F6');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onCreateCategory({
        name: name.trim(),
        type,
        color_hex: colorHex,
        icon_name: 'tag',
        monthly_budget_limit: parseFloat(budgetLimit) || 0,
      });
      setName('');
      setBudgetLimit('');
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
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Manage Categories</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* Create Form */}
            <Text style={styles.sectionHeader}>CREATE NEW CATEGORY</Text>
            
            <View style={styles.typeSwitcher}>
              <Pressable
                onPress={() => setType('expense')}
                style={[styles.typeBtn, type === 'expense' && styles.typeBtnActive]}>
                <Text style={[styles.typeText, type === 'expense' && styles.typeTextActive]}>
                  Expense
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setType('income')}
                style={[styles.typeBtn, type === 'income' && styles.typeBtnActive]}>
                <Text style={[styles.typeText, type === 'income' && styles.typeTextActive]}>
                  Income
                </Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Category Name (e.g. Subscriptions)"
              placeholderTextColor={Colors.dark.textMuted}
              value={name}
              onChangeText={setName}
            />

            {type === 'expense' && (
              <TextInput
                style={[styles.input, { marginTop: Spacing.two }]}
                placeholder="Monthly Budget Limit ($)"
                placeholderTextColor={Colors.dark.textMuted}
                keyboardType="decimal-pad"
                value={budgetLimit}
                onChangeText={setBudgetLimit}
              />
            )}

            {/* Colors */}
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

            <Pressable
              style={[styles.createBtn, (!name.trim() || submitting) && styles.disabledBtn]}
              onPress={handleCreate}
              disabled={!name.trim() || submitting}>
              <Text style={styles.createBtnText}>+ Add Category</Text>
            </Pressable>

            {/* Existing Categories List */}
            <Text style={[styles.sectionHeader, { marginTop: Spacing.four }]}>EXISTING CATEGORIES</Text>
            {categories.map((c) => (
              <View key={c.id} style={styles.catRow}>
                <View style={styles.catInfo}>
                  <View style={[styles.catDot, { backgroundColor: c.color_hex }]} />
                  <Text style={styles.catName}>{c.name}</Text>
                  <Text style={styles.catType}>({c.type})</Text>
                </View>
                <Pressable onPress={() => onDeleteCategory(c.id)} style={styles.deleteBtn}>
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
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
    paddingBottom: Spacing.six,
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
    paddingTop: Spacing.three,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.two,
    letterSpacing: 0.5,
  },
  typeSwitcher: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: Spacing.one + 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: `${Colors.dark.ledger}25`,
    borderColor: Colors.dark.ledger,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  typeTextActive: {
    color: Colors.dark.ledger,
    fontWeight: '800',
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
  colorRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginVertical: Spacing.two,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  colorCheck: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  createBtn: {
    backgroundColor: Colors.dark.ledger,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.cardBorder,
  },
  catInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
  },
  catName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  catType: {
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
  deleteBtn: {
    padding: Spacing.one,
  },
  deleteIcon: {
    fontSize: 14,
  },
});
