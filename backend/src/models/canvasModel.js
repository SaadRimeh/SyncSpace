import { query } from '../config/db.js';
import { getHabitsWithTodayStatus } from './habitModel.js';
import { getCache, setCache } from '../config/redis.js';

const CANVAS_CACHE_TTL_SECONDS = 60; // 60s cache with event-driven invalidation

/**
 * Fetch and aggregate the unified Daily Canvas for the user and target date
 */
export const getDailyCanvasData = async (user, dateStr, forceRefresh = false) => {
  const userId = user.id;
  const targetDate = dateStr || new Date().toISOString().split('T')[0];
  const targetMonth = targetDate.slice(0, 7);
  const cacheKey = `canvas:user:${userId}:${targetDate}`;

  // 1. Check Redis Cache
  if (!forceRefresh) {
    const cachedCanvas = await getCache(cacheKey);
    if (cachedCanvas) {
      return { ...cachedCanvas, _cached: true };
    }
  }

  // 2. Parallel aggregation queries across all subsystems
  const [
    synapsesRes,
    tasksRes,
    overdueTasksRes,
    habitsData,
    todaySpentRes,
    monthBudgetRes,
    recentTxRes,
  ] = await Promise.all([
    // A. Synapse Pinned & Recent Notes
    query(
      `SELECT id, title, content, tags, is_pinned, updated_at
       FROM synapses
       WHERE user_id = $1 AND is_archived = FALSE
       ORDER BY is_pinned DESC, updated_at DESC
       LIMIT 5;`,
      [userId]
    ),

    // B. Today's Scheduled Tasks
    query(
      `SELECT id, title, description, status, priority, due_date, due_time, recurrence_rule, completed_at
       FROM tasks
       WHERE user_id = $1 AND due_date = $2
       ORDER BY 
         CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         status ASC,
         due_time ASC NULLS LAST;`,
      [userId, targetDate]
    ),

    // C. Overdue Tasks Count
    query(
      `SELECT COUNT(*) AS overdue_count
       FROM tasks
       WHERE user_id = $1 AND due_date < $2 AND status NOT IN ('completed', 'cancelled');`,
      [userId, targetDate]
    ),

    // D. Habits for Today with live streaks
    getHabitsWithTodayStatus(userId, targetDate),

    // E. Today's Total Expenses
    query(
      `SELECT COALESCE(SUM(amount), 0) AS today_spent
       FROM transactions
       WHERE user_id = $1 AND type = 'expense' AND transaction_date = $2;`,
      [userId, targetDate]
    ),

    // F. Monthly Budget vs Spent
    query(
      `SELECT 
         COALESCE(SUM(monthly_budget_limit), 0) AS total_budget,
         (
           SELECT COALESCE(SUM(amount), 0) 
           FROM transactions 
           WHERE user_id = $1 AND type = 'expense' AND TO_CHAR(transaction_date, 'YYYY-MM') = $2
         ) AS total_spent
       FROM categories
       WHERE user_id = $1 AND type = 'expense';`,
      [userId, targetMonth]
    ),

    // G. Recent 3 Transactions
    query(
      `SELECT t.id, t.amount, t.type, t.transaction_date, t.note, c.name AS category_name, c.color_hex AS category_color, c.icon_name AS category_icon
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1
       ORDER BY t.transaction_date DESC, t.created_at DESC
       LIMIT 3;`,
      [userId]
    ),
  ]);

  // Process Tasks metrics
  const todayTasks = tasksRes.rows;
  const completedTasksCount = todayTasks.filter((t) => t.status === 'completed').length;
  const totalTasksCount = todayTasks.length;
  const taskProgress = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const overdueCount = parseInt(overdueTasksRes.rows[0].overdue_count || 0, 10);

  // Process Habits metrics
  const totalHabits = habitsData.length;
  const completedHabitsCount = habitsData.filter((h) => h.is_completed_today).length;
  const habitCompletionRate = totalHabits > 0 ? Math.round((completedHabitsCount / totalHabits) * 100) : 0;

  // Process Financial metrics
  const todaySpent = parseFloat(todaySpentRes.rows[0].today_spent || 0);
  const totalMonthlyBudget = parseFloat(monthBudgetRes.rows[0].total_budget || 0);
  const totalMonthlySpent = parseFloat(monthBudgetRes.rows[0].total_spent || 0);
  const budgetBurnRate = totalMonthlyBudget > 0 ? Math.min(Math.round((totalMonthlySpent / totalMonthlyBudget) * 100), 100) : 0;

  const canvasPayload = {
    date: targetDate,
    user: {
      id: user.id,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      timezone: user.timezone || 'UTC',
      currency: user.currency || 'USD',
    },
    synapse: {
      pinned_notes: synapsesRes.rows.filter((n) => n.is_pinned),
      recent_notes: synapsesRes.rows,
      total_active_notes: synapsesRes.rows.length,
    },
    tasks: {
      today_tasks: todayTasks,
      total_today: totalTasksCount,
      completed_today: completedTasksCount,
      progress_percentage: taskProgress,
      overdue_count: overdueCount,
    },
    habits: {
      today_habits: habitsData,
      total_habits: totalHabits,
      completed_habits: completedHabitsCount,
      completion_rate_percentage: habitCompletionRate,
    },
    ledger: {
      today_spent: todaySpent,
      month_spent: totalMonthlySpent,
      month_budget: totalMonthlyBudget,
      budget_burn_rate_percentage: budgetBurnRate,
      recent_transactions: recentTxRes.rows,
    },
  };

  // 3. Set Redis Cache
  await setCache(cacheKey, canvasPayload, CANVAS_CACHE_TTL_SECONDS);

  return { ...canvasPayload, _cached: false };
};
