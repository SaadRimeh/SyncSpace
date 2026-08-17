import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { CategoryItem } from './RecordTransactionModal';

interface CategoryBreakdownProps {
  categories: CategoryItem[];
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ categories }) => {
  const expenseCategories = categories.filter((c) => c.type === 'expense');

  if (expenseCategories.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Category Budget Tracking</Text>

      {expenseCategories.map((c) => {
        const spent = c.monthly_spent || 0;
        const limit = c.monthly_budget_limit || 0;
        const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
        const isOverBudget = limit > 0 && spent > limit;
        const progressWidth = Math.min(percentage, 100);

        return (
          <GlassCard key={c.id} style={styles.categoryCard}>
            <View style={styles.cardHeader}>
              <View style={styles.catTitleRow}>
                <View style={[styles.catColorCircle, { backgroundColor: c.color_hex }]} />
                <Text style={styles.catName}>{c.name}</Text>
              </View>

              <View style={styles.amountInfo}>
                <Text style={[styles.spentText, isOverBudget && styles.overBudgetText]}>
                  ${spent.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
                {limit > 0 && (
                  <Text style={styles.limitText}>
                    / ${limit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Text>
                )}
              </View>
            </View>

            {/* Progress Bar */}
            {limit > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${progressWidth}%`,
                        backgroundColor: isOverBudget ? Colors.dark.danger : c.color_hex,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.percentageText,
                    isOverBudget && { color: Colors.dark.danger, fontWeight: '800' },
                  ]}>
                  {percentage}%
                </Text>
              </View>
            )}
          </GlassCard>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: Spacing.two,
  },
  categoryCard: {
    marginBottom: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  catColorCircle: {
    width: 12,
    height: 12,
    borderRadius: BorderRadius.full,
  },
  catName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  amountInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  spentText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  overBudgetText: {
    color: Colors.dark.danger,
  },
  limitText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginLeft: 3,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.backgroundElement,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  percentageText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    fontWeight: '600',
    width: 38,
    textAlign: 'right',
  },
});
