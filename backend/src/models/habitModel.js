import { query } from '../config/db.js';
import { getCache, setCache, delCache } from '../config/redis.js';

const STREAK_TTL_SECONDS = 3600; // 1 hour streak caching

/**
 * Create a new habit
 */
export const createHabit = async ({
  user_id,
  title,
  description = null,
  category = 'general',
  color_hex = '#10B981',
  target_frequency_per_week = 7,
  reminder_time = null,
}) => {
  const sql = `
    INSERT INTO habits (user_id, title, description, category, color_hex, target_frequency_per_week, reminder_time)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, user_id, title, description, category, color_hex, target_frequency_per_week, reminder_time, is_archived, created_at, updated_at;
  `;
  const params = [user_id, title.trim(), description, category, color_hex, target_frequency_per_week, reminder_time];
  const { rows } = await query(sql, params);
  return rows[0];
};

/**
 * Compute active daily streak and longest streak for a habit
 */
export const calculateStreak = async (user_id, habit_id) => {
  const cacheKey = `habit:streak:${habit_id}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch all completed log dates in descending order
  const sql = `
    SELECT log_date
    FROM habit_logs
    WHERE habit_id = $1 AND user_id = $2 AND status = 'completed'
    ORDER BY log_date DESC;
  `;
  const { rows } = await query(sql, [habit_id, user_id]);

  if (rows.length === 0) {
    const defaultStats = { currentStreak: 0, longestStreak: 0, totalCompleted: 0 };
    await setCache(cacheKey, defaultStats, STREAK_TTL_SECONDS);
    return defaultStats;
  }

  const dates = rows.map((r) => {
    const d = new Date(r.log_date);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Check if streak is active (completed today or yesterday)
  const mostRecent = dates[0];
  const isStreakAlive = mostRecent === todayStr || mostRecent === yesterdayStr;

  if (isStreakAlive) {
    let expected = new Date(mostRecent);
    for (const dStr of dates) {
      const actual = new Date(dStr);
      const diffDays = Math.round((expected - actual) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        currentStreak++;
        expected.setDate(expected.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  for (let i = 0; i < dates.length; i++) {
    tempStreak = 1;
    let curr = new Date(dates[i]);
    for (let j = i + 1; j < dates.length; j++) {
      const next = new Date(dates[j]);
      curr.setDate(curr.getDate() - 1);
      if (curr.toISOString().split('T')[0] === next.toISOString().split('T')[0]) {
        tempStreak++;
      } else {
        break;
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
  }

  const stats = {
    currentStreak,
    longestStreak: Math.max(currentStreak, longestStreak),
    totalCompleted: dates.length,
  };

  await setCache(cacheKey, stats, STREAK_TTL_SECONDS);
  return stats;
};

/**
 * List all active habits with today's status & streaks
 */
export const getHabitsWithTodayStatus = async (user_id, todayDate) => {
  const targetDate = todayDate || new Date().toISOString().split('T')[0];

  const sql = `
    SELECT 
      h.id, h.user_id, h.title, h.description, h.category, h.color_hex, 
      h.target_frequency_per_week, h.reminder_time, h.is_archived, h.created_at, h.updated_at,
      hl.status AS today_status,
      hl.count AS today_count
    FROM habits h
    LEFT JOIN habit_logs hl 
      ON h.id = hl.habit_id 
      AND hl.user_id = h.user_id 
      AND hl.log_date = $2
    WHERE h.user_id = $1 AND h.is_archived = FALSE
    ORDER BY h.created_at ASC;
  `;
  const { rows } = await query(sql, [user_id, targetDate]);

  // Enrich with streaks
  const enriched = await Promise.all(
    rows.map(async (habit) => {
      const streakStats = await calculateStreak(user_id, habit.id);
      return {
        ...habit,
        is_completed_today: habit.today_status === 'completed',
        today_count: habit.today_count || 0,
        ...streakStats,
      };
    })
  );

  return enriched;
};

/**
 * Get single habit by ID
 */
export const getHabitById = async (user_id, id) => {
  const sql = `
    SELECT id, user_id, title, description, category, color_hex, target_frequency_per_week, reminder_time, is_archived, created_at, updated_at
    FROM habits
    WHERE id = $1 AND user_id = $2;
  `;
  const { rows } = await query(sql, [id, user_id]);
  if (!rows[0]) return null;

  const streakStats = await calculateStreak(user_id, id);
  return {
    ...rows[0],
    ...streakStats,
  };
};

/**
 * Update habit
 */
export const updateHabit = async (user_id, id, updateData) => {
  const fields = [];
  const params = [id, user_id];
  let paramIdx = 3;

  if (updateData.title !== undefined) {
    fields.push(`title = $${paramIdx++}`);
    params.push(updateData.title.trim());
  }
  if (updateData.description !== undefined) {
    fields.push(`description = $${paramIdx++}`);
    params.push(updateData.description);
  }
  if (updateData.category !== undefined) {
    fields.push(`category = $${paramIdx++}`);
    params.push(updateData.category);
  }
  if (updateData.color_hex !== undefined) {
    fields.push(`color_hex = $${paramIdx++}`);
    params.push(updateData.color_hex);
  }
  if (updateData.target_frequency_per_week !== undefined) {
    fields.push(`target_frequency_per_week = $${paramIdx++}`);
    params.push(updateData.target_frequency_per_week);
  }
  if (updateData.reminder_time !== undefined) {
    fields.push(`reminder_time = $${paramIdx++}`);
    params.push(updateData.reminder_time);
  }
  if (updateData.is_archived !== undefined) {
    fields.push(`is_archived = $${paramIdx++}`);
    params.push(updateData.is_archived);
  }

  if (fields.length === 0) {
    return getHabitById(user_id, id);
  }

  const sql = `
    UPDATE habits
    SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING id, user_id, title, description, category, color_hex, target_frequency_per_week, reminder_time, is_archived, created_at, updated_at;
  `;

  const { rows } = await query(sql, params);
  return rows[0] || null;
};

/**
 * Delete habit
 */
export const deleteHabit = async (user_id, id) => {
  const sql = `DELETE FROM habits WHERE id = $1 AND user_id = $2;`;
  const { rowCount } = await query(sql, [id, user_id]);
  await delCache(`habit:streak:${id}`);
  return rowCount > 0;
};

/**
 * Toggle or upsert a daily habit check-in log
 */
export const toggleHabitLog = async (user_id, habit_id, { log_date, status = 'completed', count = 1 }) => {
  const targetDate = log_date || new Date().toISOString().split('T')[0];

  // Upsert log entry
  const sql = `
    INSERT INTO habit_logs (habit_id, user_id, log_date, status, count)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (habit_id, user_id, log_date)
    DO UPDATE SET status = EXCLUDED.status, count = EXCLUDED.count
    RETURNING id, habit_id, user_id, log_date, status, count, created_at;
  `;
  const params = [habit_id, user_id, targetDate, status, count];
  const { rows } = await query(sql, params);

  // Invalidate cached streak
  await delCache(`habit:streak:${habit_id}`);
  const streakStats = await calculateStreak(user_id, habit_id);

  return {
    log: rows[0],
    ...streakStats,
  };
};

/**
 * Get 2D Contribution Heatmap logs for GitHub-style grid rendering
 */
export const getHabitHeatmap = async (user_id, habit_id, options = {}) => {
  const endDate = options.end_date || new Date().toISOString().split('T')[0];
  
  // Default to past 365 days
  let startDate = options.start_date;
  if (!startDate) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - 365);
    startDate = d.toISOString().split('T')[0];
  }

  const sql = `
    SELECT log_date, status, count
    FROM habit_logs
    WHERE habit_id = $1 AND user_id = $2 AND log_date BETWEEN $3 AND $4
    ORDER BY log_date ASC;
  `;
  const { rows } = await query(sql, [habit_id, user_id, startDate, endDate]);

  const heatmap = rows.map((r) => {
    const d = new Date(r.log_date);
    return {
      date: d.toISOString().split('T')[0],
      status: r.status,
      count: r.count,
    };
  });

  return {
    habit_id,
    start_date: startDate,
    end_date: endDate,
    logs: heatmap,
    totalLogs: heatmap.length,
  };
};
