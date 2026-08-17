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

export interface CategoryItem {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color_hex: string;
  icon_name: string;
  monthly_budget_limit: number;
  monthly_spent?: number;
}

interface RecordTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (txData: {
    amount: number;
    type: 'income' | 'expense';
    category_id?: string | null;
    transaction_date: string;
    note?: string | null;
  }) => Promise<void>;
  categories: CategoryItem[];
}

export const RecordTransactionModal: React.FC<RecordTransactionModalProps> = ({
  visible,
  onClose,
  onSubmit,
  categories,
}) => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [txDate, setTxDate] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmountStr('');
      setSelectedCategory(null);
      setTxDate(new Date().toISOString().split('T')[0]);
      setNote('');
    }
  }, [visible]);

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        amount: numAmount,
        type,
        category_id: selectedCategory,
        transaction_date: txDate || new Date().toISOString().split('T')[0],
        note: note.trim() || null,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const accentColor = type === 'expense' ? Colors.dark.danger : Colors.dark.success;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Record Transaction</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* Income / Expense Switcher */}
            <View style={styles.typeSwitcher}>
              <Pressable
                onPress={() => {
                  setType('expense');
                  setSelectedCategory(null);
                }}
                style={[
                  styles.typeBtn,
                  type === 'expense' && {
                    backgroundColor: `${Colors.dark.danger}25`,
                    borderColor: Colors.dark.danger,
                  },
                ]}>
                <Text
                  style={[
                    styles.typeBtnText,
                    type === 'expense' && { color: Colors.dark.danger, fontWeight: '800' },
                  ]}>
                  💸 Expense
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setType('income');
                  setSelectedCategory(null);
                }}
                style={[
                  styles.typeBtn,
                  type === 'income' && {
                    backgroundColor: `${Colors.dark.success}25`,
                    borderColor: Colors.dark.success,
                  },
                ]}>
                <Text
                  style={[
                    styles.typeBtnText,
                    type === 'income' && { color: Colors.dark.success, fontWeight: '800' },
                  ]}>
                  💰 Income
                </Text>
              </Pressable>
            </View>

            {/* Amount Input */}
            <Text style={styles.label}>AMOUNT ($)</Text>
            <View style={[styles.amountRow, { borderColor: `${accentColor}50` }]}>
              <Text style={[styles.currencyPrefix, { color: accentColor }]}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={Colors.dark.textMuted}
                keyboardType="decimal-pad"
                value={amountStr}
                onChangeText={setAmountStr}
                autoFocus
              />
            </View>

            {/* Category Selector */}
            <Text style={styles.label}>CATEGORY</Text>
            {filteredCategories.length > 0 ? (
              <View style={styles.categoryGrid}>
                {filteredCategories.map((c) => {
                  const isSelected = selectedCategory === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setSelectedCategory(isSelected ? null : c.id)}
                      style={[
                        styles.categoryChip,
                        isSelected && {
                          backgroundColor: `${c.color_hex}30`,
                          borderColor: c.color_hex,
                        },
                      ]}>
                      <View style={[styles.catColorDot, { backgroundColor: c.color_hex }]} />
                      <Text
                        style={[
                          styles.catName,
                          isSelected && { color: c.color_hex, fontWeight: '700' },
                        ]}>
                        {c.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noCategoriesText}>No categories for {type}.</Text>
            )}

            {/* Transaction Date */}
            <Text style={styles.label}>TRANSACTION DATE (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={txDate}
              onChangeText={setTxDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.dark.textMuted}
            />

            {/* Note */}
            <Text style={styles.label}>NOTE / MEMO</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. AWS Production hosting or Team lunch"
              placeholderTextColor={Colors.dark.textMuted}
              value={note}
              onChangeText={setNote}
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
                { backgroundColor: accentColor },
                (!amountStr || submitting) && styles.disabledBtn,
              ]}
              onPress={handleSubmit}
              disabled={!amountStr || submitting}>
              <Text style={styles.saveText}>
                {submitting ? 'Saving...' : `Record ${type === 'expense' ? 'Expense' : 'Income'}`}
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
  typeSwitcher: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
    marginBottom: Spacing.three,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    alignItems: 'center',
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.one,
    marginTop: Spacing.three,
    letterSpacing: 0.5,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  currencyPrefix: {
    fontSize: 28,
    fontWeight: '800',
    marginRight: Spacing.one,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.dark.text,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.backgroundElement,
  },
  catColorDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
  },
  catName: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontWeight: '500',
  },
  noCategoriesText: {
    fontSize: 13,
    color: Colors.dark.textMuted,
    fontStyle: 'italic',
    marginBottom: Spacing.one,
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
