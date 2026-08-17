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
import { RecordTransactionModal, CategoryItem } from '@/components/ledger/RecordTransactionModal';
import { CategoryBreakdown } from '@/components/ledger/CategoryBreakdown';
import { ManageCategoriesModal } from '@/components/ledger/ManageCategoriesModal';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

interface TransactionItem {
  id: string;
  category_id?: string | null;
  amount: number;
  type: 'income' | 'expense';
  transaction_date: string;
  note?: string | null;
  category_name?: string | null;
  category_color?: string | null;
  category_icon?: string | null;
  created_at: string;
}

export default function LedgerScreen() {
  const { isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [targetMonth, setTargetMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const txParams: Record<string, any> = {};
      if (selectedFilter !== 'all') {
        txParams.type = selectedFilter;
      }

      const [catRes, txRes, summaryRes] = await Promise.all([
        api.getCategories(targetMonth),
        api.getTransactions(txParams),
        api.getMonthlyLedgerSummary(targetMonth),
      ]);

      if (catRes?.data?.categories) setCategories(catRes.data.categories);
      if (txRes?.data?.transactions) setTransactions(txRes.data.transactions);
      if (summaryRes?.data?.summary) setSummary(summaryRes.data.summary);
    } catch {
      // Offline fallback
    }
  }, [targetMonth, selectedFilter]);

  // Initial load when auth becomes available
  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Silent refresh when filters or month change (no spinner)
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  const onRefresh = async () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRecordTransaction = async (txData: any) => {
    await api.createTransaction(txData);
    await loadData();
  };

  const handleDeleteTransaction = async (id: string) => {
    await api.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    await loadData();
  };

  const handleCreateCategory = async (catData: any) => {
    await api.createCategory(catData);
    await loadData();
  };

  const handleDeleteCategory = async (id: string) => {
    // Handled in backend
    await loadData();
  };

  const changeMonth = (delta: number) => {
    const [y, m] = targetMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const nextMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setTargetMonth(nextMonth);
  };

  const displayMonth = new Date(`${targetMonth}-01T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const totalIncome = summary?.total_income || 0;
  const totalExpense = summary?.total_expense || 0;
  const netSavings = summary?.net_savings || totalIncome - totalExpense;
  const savingsRate = summary?.savings_rate || (totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.dark.ledger}
          />
        }>
        {/* Header */}
        <HeaderBar
          title="Nano-Ledger"
          subtitle="Real-time Financial Budget & Analytics"
          accentColor={Colors.dark.ledger}
          rightAction={{
            label: '+ Entry',
            onPress: () => setIsRecordModalOpen(true),
          }}
        />

        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <Pressable onPress={() => changeMonth(-1)} style={styles.monthArrowBtn}>
            <Text style={styles.arrowText}>‹</Text>
          </Pressable>
          <Text style={styles.monthNavText}>{displayMonth}</Text>
          <Pressable onPress={() => changeMonth(1)} style={styles.monthArrowBtn}>
            <Text style={styles.arrowText}>›</Text>
          </Pressable>
        </View>

        {/* Financial Summary Card */}
        <GlassCard accentColor={Colors.dark.ledger} glow style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <GradientBadge label="MONTHLY SAVINGS MATRIX" color={Colors.dark.ledger} />
            <Pressable onPress={() => setIsCategoriesModalOpen(true)} style={styles.manageCatsBtn}>
              <Text style={styles.manageCatsText}>⚙️ Categories</Text>
            </Pressable>
          </View>

          <View style={styles.balanceContainer}>
            <Text
              style={[
                styles.balanceValue,
                netSavings < 0 ? { color: Colors.dark.danger } : { color: Colors.dark.text },
              ]}>
              {netSavings >= 0 ? '+' : '-'}${Math.abs(netSavings).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={styles.balanceLabel}>
              Net Savings Rate ({savingsRate >= 0 ? `${savingsRate}%` : 'Deficit'})
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Text style={[styles.breakdownValue, { color: Colors.dark.success }]}>
                +${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={styles.breakdownLabel}>Income</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Text style={[styles.breakdownValue, { color: Colors.dark.danger }]}>
                -${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={styles.breakdownLabel}>Expenses</Text>
            </View>
          </View>
        </GlassCard>

        {/* Category Budget Breakdown */}
        <CategoryBreakdown categories={categories} />

        {/* Transactions Feed */}
        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Transaction Feed</Text>
            <View style={styles.filterPills}>
              {(['all', 'expense', 'income'] as const).map((filter) => (
                <Pressable
                  key={filter}
                  onPress={() => setSelectedFilter(filter)}
                  style={[
                    styles.filterPill,
                    selectedFilter === filter && {
                      backgroundColor: `${Colors.dark.ledger}25`,
                      borderColor: Colors.dark.ledger,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.filterPillText,
                      selectedFilter === filter && { color: Colors.dark.ledger, fontWeight: '800' },
                    ]}>
                    {filter.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.dark.ledger} />
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💎</Text>
              <Text style={styles.emptyTitle}>No Transactions Recorded</Text>
              <Text style={styles.emptySubtitle}>
                Add income or expense entries to track cash flow in real-time.
              </Text>
              <Pressable style={styles.emptyBtn} onPress={() => setIsRecordModalOpen(true)}>
                <Text style={styles.emptyBtnText}>+ Record Entry</Text>
              </Pressable>
            </View>
          ) : (
            transactions.map((tx) => {
              const isIncome = tx.type === 'income';
              return (
                <GlassCard key={tx.id} style={styles.txCard}>
                  <View style={styles.txRow}>
                    <View
                      style={[
                        styles.catIconBox,
                        { backgroundColor: `${tx.category_color || Colors.dark.ledger}20` },
                      ]}>
                      <Text style={styles.catIconEmoji}>
                        {isIncome ? '💰' : '💸'}
                      </Text>
                    </View>

                    <View style={styles.txDetails}>
                      <Text style={styles.txName}>{tx.category_name || (isIncome ? 'Income' : 'Expense')}</Text>
                      <Text style={styles.txDate}>
                        {tx.transaction_date} {tx.note ? `• ${tx.note}` : ''}
                      </Text>
                    </View>

                    <View style={styles.txRight}>
                      <Text
                        style={[
                          styles.txAmount,
                          isIncome ? { color: Colors.dark.success } : { color: Colors.dark.danger },
                        ]}>
                        {isIncome ? '+' : '-'}${parseFloat(String(tx.amount)).toFixed(2)}
                      </Text>
                      <Pressable
                        onPress={() => handleDeleteTransaction(tx.id)}
                        style={styles.deleteTxBtn}>
                        <Text style={styles.deleteTxText}>✕</Text>
                      </Pressable>
                    </View>
                  </View>
                </GlassCard>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Record Transaction Modal */}
      <RecordTransactionModal
        visible={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSubmit={handleRecordTransaction}
        categories={categories}
      />

      {/* Manage Categories Modal */}
      <ManageCategoriesModal
        visible={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        categories={categories}
        onCreateCategory={handleCreateCategory}
        onDeleteCategory={handleDeleteCategory}
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
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    marginBottom: Spacing.two,
  },
  monthArrowBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.half,
  },
  arrowText: {
    fontSize: 24,
    color: Colors.dark.textSecondary,
    fontWeight: '300',
  },
  monthNavText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  summaryCard: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.four,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  manageCatsBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  manageCatsText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    fontWeight: '600',
  },
  balanceContainer: {
    marginVertical: Spacing.two,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  balanceLabel: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.cardBorder,
  },
  breakdownItem: {
    alignItems: 'center',
    flex: 1,
  },
  breakdownValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  breakdownLabel: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  breakdownDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.dark.cardBorder,
  },
  transactionsSection: {
    marginHorizontal: Spacing.four,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  filterPills: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  filterPill: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.half,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.dark.cardBorder,
    backgroundColor: Colors.dark.backgroundElement,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
  },
  txCard: {
    marginBottom: Spacing.two,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catIconBox: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  catIconEmoji: {
    fontSize: 16,
  },
  txDetails: {
    flex: 1,
  },
  txName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  txDate: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  deleteTxBtn: {
    paddingTop: Spacing.half,
    paddingLeft: Spacing.one,
  },
  deleteTxText: {
    fontSize: 11,
    color: Colors.dark.textMuted,
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
    backgroundColor: Colors.dark.ledger,
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
