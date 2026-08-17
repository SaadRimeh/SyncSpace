import pg from 'pg';
import crypto from 'crypto';
import { env } from './env.js';

const { Pool } = pg;

// Parse PostgreSQL DATE columns (OID 1082) directly as 'YYYY-MM-DD' strings
pg.types.setTypeParser(1082, (val) => val);

// Parse PostgreSQL NUMERIC/DECIMAL columns (OID 1700) directly as floats
pg.types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));

// Parse PostgreSQL BIGINT/INT8 columns (OID 20) directly as integers
pg.types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));

const poolConfig = env.DATABASE_URL
  ? {
      connectionString: env.DATABASE_URL,
      max: env.PG_MAX_POOL_SIZE,
      idleTimeoutMillis: env.PG_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: env.PG_CONNECTION_TIMEOUT_MS || 5000,
      ssl:
        env.DATABASE_URL.includes('supabase') ||
        env.DATABASE_URL.includes('sslmode=require') ||
        !env.DATABASE_URL.includes('localhost')
          ? { rejectUnauthorized: false }
          : undefined,
    }
  : {
      host: env.PGHOST,
      port: env.PGPORT,
      database: env.PGDATABASE,
      user: env.PGUSER,
      password: env.PGPASSWORD,
      max: env.PG_MAX_POOL_SIZE,
      idleTimeoutMillis: env.PG_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: env.PG_CONNECTION_TIMEOUT_MS || 5000,
      ssl: env.PGHOST.includes('supabase') || (env.PGHOST !== 'localhost' && env.PGHOST !== '127.0.0.1')
        ? { rejectUnauthorized: false }
        : undefined,
    };

export const pool = new Pool(poolConfig);

let isPostgresAvailable = null;

// Standalone in-memory datastore for offline development and CI/CD testing
const memoryStore = {
  users: new Map(),
  synapses: new Map(),
  tasks: new Map(),
  habits: new Map(),
  habit_logs: new Map(),
  categories: new Map(),
  transactions: new Map(),
};

/**
 * Handle in-memory query evaluation
 */
const executeMemoryQuery = async (text, params = []) => {
  const normalized = text.replace(/\s+/g, ' ').trim();

  // Transaction control statements
  if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(normalized.toUpperCase())) {
    return { rows: [], rowCount: 0 };
  }

  // Health check query
  if (normalized.includes('SELECT 1 AS healthy')) {
    return {
      rows: [{ healthy: 1, timestamp: new Date().toISOString() }],
      rowCount: 1,
    };
  }

  // ================= USERS =================
  // INSERT INTO users
  if (normalized.startsWith('INSERT INTO users')) {
    const [email, password_hash, full_name, avatar_url, timezone, currency] = params;
    
    for (const u of memoryStore.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        const err = new Error('duplicate key value violates unique constraint "users_email_key"');
        err.code = '23505';
        throw err;
      }
    }

    const now = new Date().toISOString();
    const newUser = {
      id: crypto.randomUUID(),
      email,
      password_hash,
      full_name,
      avatar_url: avatar_url || null,
      timezone: timezone || 'UTC',
      currency: currency || 'USD',
      created_at: now,
      updated_at: now,
    };

    memoryStore.users.set(newUser.id, newUser);

    const { password_hash: _, ...sanitized } = newUser;
    return {
      rows: [sanitized],
      rowCount: 1,
    };
  }

  // SELECT ... FROM users WHERE LOWER(email) = LOWER($1)
  if (normalized.startsWith('SELECT') && normalized.includes('FROM users') && normalized.includes('LOWER(email) = LOWER($1)')) {
    const email = params[0].toLowerCase();
    let found = null;
    for (const u of memoryStore.users.values()) {
      if (u.email.toLowerCase() === email) {
        found = { ...u };
        break;
      }
    }
    return {
      rows: found ? [found] : [],
      rowCount: found ? 1 : 0,
    };
  }

  // SELECT ... FROM users WHERE id = $1
  if (normalized.startsWith('SELECT') && normalized.includes('FROM users') && normalized.includes('WHERE id = $1')) {
    const id = params[0];
    const user = memoryStore.users.get(id);
    if (!user) {
      return { rows: [], rowCount: 0 };
    }
    if (normalized.includes('password_hash')) {
      return { rows: [{ ...user }], rowCount: 1 };
    }
    const { password_hash, ...sanitized } = user;
    return { rows: [sanitized], rowCount: 1 };
  }

  // UPDATE users SET password_hash = $2
  if (normalized.startsWith('UPDATE users') && normalized.includes('password_hash = $2')) {
    const [id, newPasswordHash] = params;
    const user = memoryStore.users.get(id);
    if (!user) {
      return { rows: [], rowCount: 0 };
    }
    user.password_hash = newPasswordHash;
    user.updated_at = new Date().toISOString();
    return { rows: [user], rowCount: 1 };
  }

  // UPDATE users SET ...
  if (normalized.startsWith('UPDATE users')) {
    const id = params[0];
    const user = memoryStore.users.get(id);
    if (!user) {
      return { rows: [], rowCount: 0 };
    }

    let paramIdx = 1;
    if (normalized.includes('full_name = $')) {
      user.full_name = params[paramIdx++];
    }
    if (normalized.includes('avatar_url = $')) {
      user.avatar_url = params[paramIdx++];
    }
    if (normalized.includes('timezone = $')) {
      user.timezone = params[paramIdx++];
    }
    if (normalized.includes('currency = $')) {
      user.currency = params[paramIdx++];
    }
    user.updated_at = new Date().toISOString();

    const { password_hash, ...sanitized } = user;
    return { rows: [sanitized], rowCount: 1 };
  }

  // DELETE FROM users WHERE id = $1
  if (normalized.startsWith('DELETE FROM users')) {
    const id = params[0];
    const deleted = memoryStore.users.delete(id);
    return { rows: [], rowCount: deleted ? 1 : 0 };
  }

  // ================= SYNAPSES =================
  // INSERT INTO synapses
  if (normalized.startsWith('INSERT INTO synapses')) {
    const [user_id, title, content, tags, is_pinned] = params;
    const now = new Date().toISOString();
    const newNote = {
      id: crypto.randomUUID(),
      user_id,
      title,
      content: content || '',
      tags: tags || [],
      is_pinned: is_pinned || false,
      is_archived: false,
      converted_to_task_id: null,
      created_at: now,
      updated_at: now,
    };
    memoryStore.synapses.set(newNote.id, newNote);
    return { rows: [{ ...newNote }], rowCount: 1 };
  }

  // SELECT DISTINCT unnest(tags) AS tag FROM synapses WHERE user_id = $1
  if (normalized.includes('unnest(tags)') && normalized.includes('FROM synapses')) {
    const user_id = params[0];
    const tagSet = new Set();
    for (const note of memoryStore.synapses.values()) {
      if (note.user_id === user_id && !note.is_archived && Array.isArray(note.tags)) {
        note.tags.forEach((t) => tagSet.add(t));
      }
    }
    const sortedTags = Array.from(tagSet).sort().map((tag) => ({ tag }));
    return { rows: sortedTags, rowCount: sortedTags.length };
  }

  // SELECT COUNT(*) AS total FROM synapses WHERE ...
  if (normalized.startsWith('SELECT COUNT(*) AS total FROM synapses')) {
    const user_id = params[0];
    const matching = Array.from(memoryStore.synapses.values()).filter((n) => {
      if (n.user_id !== user_id) return false;
      if (normalized.includes('is_archived = $') && params[1] !== undefined && n.is_archived !== params[1]) {
        return false;
      }
      return true;
    });
    return { rows: [{ total: matching.length }], rowCount: 1 };
  }

  // Synapse Daily Canvas query: SELECT id, title, content, tags, is_pinned, updated_at FROM synapses WHERE user_id = $1 AND is_archived = FALSE ORDER BY is_pinned DESC, updated_at DESC LIMIT 5
  if (normalized.startsWith('SELECT') && normalized.includes('FROM synapses') && normalized.includes('is_archived = FALSE') && normalized.includes('LIMIT 5')) {
    const user_id = params[0];
    const notes = Array.from(memoryStore.synapses.values())
      .filter((n) => n.user_id === user_id && !n.is_archived)
      .sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.updated_at) - new Date(a.updated_at);
      })
      .slice(0, 5);
    return { rows: notes.map((n) => ({ ...n })), rowCount: notes.length };
  }

  // SELECT single note: WHERE id = $1 AND user_id = $2
  if (normalized.startsWith('SELECT') && normalized.includes('FROM synapses') && normalized.includes('WHERE id = $1 AND user_id = $2')) {
    const [id, user_id] = params;
    const note = memoryStore.synapses.get(id);
    if (note && note.user_id === user_id) {
      return { rows: [{ ...note }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // SELECT list of synapses (paginated)
  if (normalized.startsWith('SELECT') && normalized.includes('FROM synapses') && normalized.includes('LIMIT')) {
    const user_id = params[0];
    let notes = Array.from(memoryStore.synapses.values()).filter((n) => n.user_id === user_id);

    // Apply filters
    for (let i = 1; i < params.length - 2; i++) {
      const p = params[i];
      if (typeof p === 'boolean') {
        notes = notes.filter((n) => n.is_archived === p || n.is_pinned === p);
      } else if (typeof p === 'string' && p.startsWith('%') && p.endsWith('%')) {
        const term = p.slice(1, -1).toLowerCase();
        notes = notes.filter((n) => n.title.toLowerCase().includes(term) || n.content.toLowerCase().includes(term));
      } else if (typeof p === 'string' && !p.startsWith('%')) {
        notes = notes.filter((n) => n.tags && n.tags.includes(p));
      }
    }

    // Sort by is_pinned DESC, updated_at DESC
    notes.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.updated_at) - new Date(a.updated_at);
    });

    const limit = params[params.length - 2] || 20;
    const offset = params[params.length - 1] || 0;
    const paginated = notes.slice(offset, offset + limit);

    return { rows: paginated.map((n) => ({ ...n })), rowCount: paginated.length };
  }

  // UPDATE synapses SET converted_to_task_id = $1, is_archived = ... WHERE id = $3 AND user_id = $4
  if (normalized.startsWith('UPDATE synapses') && normalized.includes('converted_to_task_id = $1')) {
    const [taskId, archiveNote, synapseId, userId] = params;
    const note = memoryStore.synapses.get(synapseId);
    if (!note || note.user_id !== userId) {
      return { rows: [], rowCount: 0 };
    }
    note.converted_to_task_id = taskId;
    if (archiveNote === true) {
      note.is_archived = true;
    }
    note.updated_at = new Date().toISOString();
    return { rows: [{ ...note }], rowCount: 1 };
  }

  // UPDATE synapses SET ...
  if (normalized.startsWith('UPDATE synapses')) {
    const [id, user_id] = params;
    const note = memoryStore.synapses.get(id);
    if (!note || note.user_id !== user_id) {
      return { rows: [], rowCount: 0 };
    }

    let paramIdx = 2;
    if (normalized.includes('title = $')) {
      note.title = params[paramIdx++];
    }
    if (normalized.includes('content = $')) {
      note.content = params[paramIdx++];
    }
    if (normalized.includes('tags = $')) {
      note.tags = params[paramIdx++];
    }
    if (normalized.includes('is_pinned = $')) {
      note.is_pinned = params[paramIdx++];
    }
    if (normalized.includes('is_archived = $')) {
      note.is_archived = params[paramIdx++];
    }
    note.updated_at = new Date().toISOString();
    return { rows: [{ ...note }], rowCount: 1 };
  }

  // DELETE FROM synapses WHERE id = $1 AND user_id = $2
  if (normalized.startsWith('DELETE FROM synapses')) {
    const [id, user_id] = params;
    const note = memoryStore.synapses.get(id);
    if (note && note.user_id === user_id) {
      memoryStore.synapses.delete(id);
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // ================= TASKS =================
  // INSERT INTO tasks
  if (normalized.startsWith('INSERT INTO tasks')) {
    const [user_id, synapse_id, title, description, priority, due_date, due_time, recurrence_rule] = params;
    const now = new Date().toISOString();
    const newTask = {
      id: crypto.randomUUID(),
      user_id,
      synapse_id: synapse_id || null,
      title,
      description: description || null,
      status: 'todo',
      priority: priority || 'medium',
      due_date: due_date || null,
      due_time: due_time || null,
      recurrence_rule: recurrence_rule || null,
      completed_at: null,
      created_at: now,
      updated_at: now,
    };
    memoryStore.tasks.set(newTask.id, newTask);
    return { rows: [{ ...newTask }], rowCount: 1 };
  }

  // Task Summary Stats: SELECT COUNT(*) FILTER ... FROM tasks WHERE user_id = $1
  if (normalized.startsWith('SELECT') && normalized.includes('FROM tasks') && normalized.includes('FILTER (WHERE status')) {
    const user_id = params[0];
    const userTasks = Array.from(memoryStore.tasks.values()).filter((t) => t.user_id === user_id);
    const todayStr = new Date().toISOString().split('T')[0];

    let todo_count = 0;
    let in_progress_count = 0;
    let completed_count = 0;
    let cancelled_count = 0;
    let overdue_count = 0;

    for (const t of userTasks) {
      if (t.status === 'todo') todo_count++;
      if (t.status === 'in_progress') in_progress_count++;
      if (t.status === 'completed') completed_count++;
      if (t.status === 'cancelled') cancelled_count++;
      if (t.due_date && t.due_date < todayStr && !['completed', 'cancelled'].includes(t.status)) {
        overdue_count++;
      }
    }

    return {
      rows: [
        {
          todo_count,
          in_progress_count,
          completed_count,
          cancelled_count,
          overdue_count,
          total_count: userTasks.length,
        },
      ],
      rowCount: 1,
    };
  }

  // Overdue count query for canvas: SELECT COUNT(*) AS overdue_count FROM tasks WHERE user_id = $1 AND due_date < $2 AND status NOT IN ('completed', 'cancelled')
  if (normalized.startsWith('SELECT COUNT(*) AS overdue_count FROM tasks')) {
    const [user_id, targetDate] = params;
    const count = Array.from(memoryStore.tasks.values()).filter(
      (t) => t.user_id === user_id && t.due_date && t.due_date < targetDate && !['completed', 'cancelled'].includes(t.status)
    ).length;
    return { rows: [{ overdue_count: count }], rowCount: 1 };
  }

  // Tasks for Canvas Today: SELECT id, title, description, status, priority, due_date, due_time, recurrence_rule, completed_at FROM tasks WHERE user_id = $1 AND due_date = $2
  if (normalized.startsWith('SELECT') && normalized.includes('FROM tasks') && normalized.includes('WHERE user_id = $1 AND due_date = $2')) {
    const [user_id, targetDate] = params;
    const priorityRank = { urgent: 1, high: 2, medium: 3, low: 4 };
    const tasks = Array.from(memoryStore.tasks.values())
      .filter((t) => t.user_id === user_id && t.due_date === targetDate)
      .sort((a, b) => {
        const pDiff = (priorityRank[a.priority] || 3) - (priorityRank[b.priority] || 3);
        if (pDiff !== 0) return pDiff;
        if (a.due_time && b.due_time) return a.due_time.localeCompare(b.due_time);
        return 0;
      });
    return { rows: tasks.map((t) => ({ ...t })), rowCount: tasks.length };
  }

  // SELECT COUNT(*) AS total FROM tasks WHERE ...
  if (normalized.startsWith('SELECT COUNT(*) AS total FROM tasks')) {
    const user_id = params[0];
    const matching = Array.from(memoryStore.tasks.values()).filter((t) => {
      if (t.user_id !== user_id) return false;
      if (normalized.includes('status = $') && params[1] && t.status !== params[1]) return false;
      if (normalized.includes('priority = $') && params[1] && t.priority !== params[1]) return false;
      return true;
    });
    return { rows: [{ total: matching.length }], rowCount: 1 };
  }

  // SELECT single task: WHERE id = $1 AND user_id = $2
  if (normalized.startsWith('SELECT') && normalized.includes('FROM tasks') && normalized.includes('WHERE id = $1 AND user_id = $2')) {
    const [id, user_id] = params;
    const task = memoryStore.tasks.get(id);
    if (task && task.user_id === user_id) {
      return { rows: [{ ...task }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // SELECT list of tasks (paginated)
  if (normalized.startsWith('SELECT') && normalized.includes('FROM tasks') && normalized.includes('LIMIT')) {
    const user_id = params[0];
    let tasks = Array.from(memoryStore.tasks.values()).filter((t) => t.user_id === user_id);

    // Apply filters
    for (let i = 1; i < params.length - 2; i++) {
      const p = params[i];
      if (['todo', 'in_progress', 'completed', 'cancelled'].includes(p)) {
        tasks = tasks.filter((t) => t.status === p);
      } else if (['low', 'medium', 'high', 'urgent'].includes(p)) {
        tasks = tasks.filter((t) => t.priority === p);
      } else if (typeof p === 'string' && p.startsWith('%') && p.endsWith('%')) {
        const term = p.slice(1, -1).toLowerCase();
        tasks = tasks.filter((t) => t.title.toLowerCase().includes(term) || (t.description && t.description.toLowerCase().includes(term)));
      } else if (typeof p === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p)) {
        tasks = tasks.filter((t) => t.due_date === p);
      }
    }

    const priorityRank = { urgent: 1, high: 2, medium: 3, low: 4 };
    tasks.sort((a, b) => {
      if (!a.due_date && b.due_date) return 1;
      if (a.due_date && !b.due_date) return -1;
      if (a.due_date !== b.due_date) return a.due_date > b.due_date ? 1 : -1;
      return (priorityRank[a.priority] || 3) - (priorityRank[b.priority] || 3);
    });

    const limit = params[params.length - 2] || 20;
    const offset = params[params.length - 1] || 0;
    const paginated = tasks.slice(offset, offset + limit);

    return { rows: paginated.map((t) => ({ ...t })), rowCount: paginated.length };
  }

  // UPDATE tasks SET ...
  if (normalized.startsWith('UPDATE tasks')) {
    const [id, user_id] = params;
    const task = memoryStore.tasks.get(id);
    if (!task || task.user_id !== user_id) {
      return { rows: [], rowCount: 0 };
    }

    let paramIdx = 2;
    if (normalized.includes('title = $')) task.title = params[paramIdx++];
    if (normalized.includes('description = $')) task.description = params[paramIdx++];
    if (normalized.includes('priority = $')) task.priority = params[paramIdx++];
    if (normalized.includes('due_date = $')) task.due_date = params[paramIdx++];
    if (normalized.includes('due_time = $')) task.due_time = params[paramIdx++];
    if (normalized.includes('recurrence_rule = $')) task.recurrence_rule = params[paramIdx++];
    if (normalized.includes('status = $')) {
      task.status = params[paramIdx++];
      if (task.status === 'completed') {
        task.completed_at = task.completed_at || new Date().toISOString();
      } else {
        task.completed_at = null;
      }
    }
    task.updated_at = new Date().toISOString();
    return { rows: [{ ...task }], rowCount: 1 };
  }

  // DELETE FROM tasks WHERE id = $1 AND user_id = $2
  if (normalized.startsWith('DELETE FROM tasks')) {
    const [id, user_id] = params;
    const task = memoryStore.tasks.get(id);
    if (task && task.user_id === user_id) {
      memoryStore.tasks.delete(id);
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // ================= HABITS =================
  // INSERT INTO habits
  if (normalized.startsWith('INSERT INTO habits')) {
    const [user_id, title, description, category, color_hex, target_frequency_per_week, reminder_time] = params;
    const now = new Date().toISOString();
    const newHabit = {
      id: crypto.randomUUID(),
      user_id,
      title,
      description: description || null,
      category: category || 'general',
      color_hex: color_hex || '#10B981',
      target_frequency_per_week: target_frequency_per_week || 7,
      reminder_time: reminder_time || null,
      is_archived: false,
      created_at: now,
      updated_at: now,
    };
    memoryStore.habits.set(newHabit.id, newHabit);
    return { rows: [{ ...newHabit }], rowCount: 1 };
  }

  // SELECT ... FROM habits h LEFT JOIN habit_logs hl ... WHERE h.user_id = $1 AND h.is_archived = FALSE
  if (normalized.startsWith('SELECT') && normalized.includes('FROM habits') && normalized.includes('LEFT JOIN habit_logs')) {
    const [user_id, todayDate] = params;
    const userHabits = Array.from(memoryStore.habits.values())
      .filter((h) => h.user_id === user_id && !h.is_archived)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const enriched = userHabits.map((h) => {
      const logKey = `${h.id}:${user_id}:${todayDate}`;
      const log = memoryStore.habit_logs.get(logKey);
      return {
        ...h,
        today_status: log ? log.status : null,
        today_count: log ? log.count : 0,
      };
    });

    return { rows: enriched, rowCount: enriched.length };
  }

  // SELECT single habit: WHERE id = $1 AND user_id = $2
  if (normalized.startsWith('SELECT') && normalized.includes('FROM habits') && normalized.includes('WHERE id = $1 AND user_id = $2')) {
    const [id, user_id] = params;
    const habit = memoryStore.habits.get(id);
    if (habit && habit.user_id === user_id) {
      return { rows: [{ ...habit }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // UPDATE habits SET ...
  if (normalized.startsWith('UPDATE habits')) {
    const [id, user_id] = params;
    const habit = memoryStore.habits.get(id);
    if (!habit || habit.user_id !== user_id) {
      return { rows: [], rowCount: 0 };
    }

    let paramIdx = 2;
    if (normalized.includes('title = $')) habit.title = params[paramIdx++];
    if (normalized.includes('description = $')) habit.description = params[paramIdx++];
    if (normalized.includes('category = $')) habit.category = params[paramIdx++];
    if (normalized.includes('color_hex = $')) habit.color_hex = params[paramIdx++];
    if (normalized.includes('target_frequency_per_week = $')) habit.target_frequency_per_week = params[paramIdx++];
    if (normalized.includes('reminder_time = $')) habit.reminder_time = params[paramIdx++];
    if (normalized.includes('is_archived = $')) habit.is_archived = params[paramIdx++];
    habit.updated_at = new Date().toISOString();
    return { rows: [{ ...habit }], rowCount: 1 };
  }

  // DELETE FROM habits WHERE id = $1 AND user_id = $2
  if (normalized.startsWith('DELETE FROM habits')) {
    const [id, user_id] = params;
    const habit = memoryStore.habits.get(id);
    if (habit && habit.user_id === user_id) {
      memoryStore.habits.delete(id);
      for (const [key, log] of memoryStore.habit_logs.entries()) {
        if (log.habit_id === id) {
          memoryStore.habit_logs.delete(key);
        }
      }
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // ================= HABIT LOGS =================
  // INSERT INTO habit_logs ... ON CONFLICT
  if (normalized.startsWith('INSERT INTO habit_logs')) {
    const [habit_id, user_id, log_date, status, count] = params;
    const key = `${habit_id}:${user_id}:${log_date}`;
    const log = {
      id: crypto.randomUUID(),
      habit_id,
      user_id,
      log_date,
      status: status || 'completed',
      count: count || 1,
      created_at: new Date().toISOString(),
    };
    memoryStore.habit_logs.set(key, log);
    return { rows: [{ ...log }], rowCount: 1 };
  }

  // SELECT log_date FROM habit_logs WHERE habit_id = $1 AND user_id = $2 AND status = 'completed' ORDER BY log_date DESC
  if (normalized.startsWith('SELECT log_date FROM habit_logs') && normalized.includes("status = 'completed'")) {
    const [habit_id, user_id] = params;
    const logs = Array.from(memoryStore.habit_logs.values())
      .filter((l) => l.habit_id === habit_id && l.user_id === user_id && l.status === 'completed')
      .sort((a, b) => (a.log_date > b.log_date ? -1 : 1))
      .map((l) => ({ log_date: l.log_date }));
    return { rows: logs, rowCount: logs.length };
  }

  // SELECT log_date, status, count FROM habit_logs WHERE habit_id = $1 AND user_id = $2 AND log_date BETWEEN $3 AND $4 ORDER BY log_date ASC
  if (normalized.startsWith('SELECT log_date, status, count FROM habit_logs')) {
    const [habit_id, user_id, startDate, endDate] = params;
    const logs = Array.from(memoryStore.habit_logs.values())
      .filter((l) => l.habit_id === habit_id && l.user_id === user_id && l.log_date >= startDate && l.log_date <= endDate)
      .sort((a, b) => (a.log_date < b.log_date ? -1 : 1))
      .map((l) => ({ log_date: l.log_date, status: l.status, count: l.count }));
    return { rows: logs, rowCount: logs.length };
  }

  // ================= CATEGORIES =================
  // INSERT INTO categories
  if (normalized.startsWith('INSERT INTO categories')) {
    const [user_id, name, type, color_hex, icon_name, monthly_budget_limit] = params;

    // Check unique constraint (user_id, name, type)
    for (const c of memoryStore.categories.values()) {
      if (c.user_id === user_id && c.name.toLowerCase() === name.toLowerCase() && c.type === type) {
        const err = new Error('duplicate key value violates unique constraint "categories_user_id_name_type_key"');
        err.code = '23505';
        throw err;
      }
    }

    const newCategory = {
      id: crypto.randomUUID(),
      user_id,
      name,
      type,
      color_hex: color_hex || '#6366F1',
      icon_name: icon_name || 'wallet',
      monthly_budget_limit: monthly_budget_limit || 0,
      created_at: new Date().toISOString(),
    };
    memoryStore.categories.set(newCategory.id, newCategory);
    return { rows: [{ ...newCategory }], rowCount: 1 };
  }

  // SELECT ... FROM categories c LEFT JOIN transactions t ... WHERE c.user_id = $1 GROUP BY c.id
  if (normalized.startsWith('SELECT') && normalized.includes('FROM categories c LEFT JOIN transactions t')) {
    const [user_id, month] = params;
    const userCats = Array.from(memoryStore.categories.values()).filter((c) => c.user_id === user_id);

    const enriched = userCats.map((c) => {
      let spent = 0;
      for (const t of memoryStore.transactions.values()) {
        if (t.category_id === c.id && t.user_id === user_id && t.transaction_date.startsWith(month)) {
          spent += parseFloat(t.amount);
        }
      }
      return {
        ...c,
        monthly_spent: spent,
      };
    });

    return { rows: enriched, rowCount: enriched.length };
  }

  // Monthly Budget Total query for canvas: SELECT COALESCE(SUM(monthly_budget_limit), 0) AS total_budget, ... FROM categories WHERE user_id = $1 AND type = 'expense'
  if (normalized.startsWith('SELECT') && normalized.includes('FROM categories') && normalized.includes('total_budget')) {
    const [user_id, month] = params;
    let totalBudget = 0;
    for (const c of memoryStore.categories.values()) {
      if (c.user_id === user_id && c.type === 'expense') {
        totalBudget += parseFloat(c.monthly_budget_limit || 0);
      }
    }
    let totalSpent = 0;
    for (const t of memoryStore.transactions.values()) {
      if (t.user_id === user_id && t.type === 'expense' && t.transaction_date.startsWith(month)) {
        totalSpent += parseFloat(t.amount);
      }
    }
    return { rows: [{ total_budget: totalBudget, total_spent: totalSpent }], rowCount: 1 };
  }

  // SELECT single category: WHERE id = $1 AND user_id = $2
  if (normalized.startsWith('SELECT') && normalized.includes('FROM categories') && normalized.includes('WHERE id = $1 AND user_id = $2')) {
    const [id, user_id] = params;
    const cat = memoryStore.categories.get(id);
    if (cat && cat.user_id === user_id) {
      return { rows: [{ ...cat }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // UPDATE categories SET ...
  if (normalized.startsWith('UPDATE categories')) {
    const [id, user_id] = params;
    const cat = memoryStore.categories.get(id);
    if (!cat || cat.user_id !== user_id) {
      return { rows: [], rowCount: 0 };
    }

    let paramIdx = 2;
    if (normalized.includes('name = $')) cat.name = params[paramIdx++];
    if (normalized.includes('color_hex = $')) cat.color_hex = params[paramIdx++];
    if (normalized.includes('icon_name = $')) cat.icon_name = params[paramIdx++];
    if (normalized.includes('monthly_budget_limit = $')) cat.monthly_budget_limit = params[paramIdx++];
    return { rows: [{ ...cat }], rowCount: 1 };
  }

  // DELETE FROM categories WHERE id = $1 AND user_id = $2
  if (normalized.startsWith('DELETE FROM categories')) {
    const [id, user_id] = params;
    const cat = memoryStore.categories.get(id);
    if (cat && cat.user_id === user_id) {
      memoryStore.categories.delete(id);
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // ================= TRANSACTIONS =================
  // INSERT INTO transactions
  if (normalized.startsWith('INSERT INTO transactions')) {
    const [user_id, category_id, amount, type, transaction_date, note] = params;
    const now = new Date().toISOString();
    const newTx = {
      id: crypto.randomUUID(),
      user_id,
      category_id: category_id || null,
      amount: parseFloat(amount),
      type,
      transaction_date: transaction_date || now.split('T')[0],
      note: note || null,
      created_at: now,
      updated_at: now,
    };
    memoryStore.transactions.set(newTx.id, newTx);
    return { rows: [{ ...newTx }], rowCount: 1 };
  }

  // Today's Total Expenses for canvas: SELECT COALESCE(SUM(amount), 0) AS today_spent FROM transactions WHERE user_id = $1 AND type = 'expense' AND transaction_date = $2
  if (normalized.startsWith('SELECT') && normalized.includes('today_spent') && normalized.includes('FROM transactions')) {
    const [user_id, targetDate] = params;
    let spent = 0;
    for (const t of memoryStore.transactions.values()) {
      if (t.user_id === user_id && t.type === 'expense' && t.transaction_date === targetDate) {
        spent += parseFloat(t.amount);
      }
    }
    return { rows: [{ today_spent: spent }], rowCount: 1 };
  }

  // Monthly totals: SELECT COALESCE(SUM(CASE WHEN type = 'income' ...)) FROM transactions WHERE user_id = $1 AND TO_CHAR(transaction_date, 'YYYY-MM') = $2
  if (normalized.startsWith('SELECT') && normalized.includes('FROM transactions') && normalized.includes('total_income')) {
    const [user_id, month] = params;
    let totalIncome = 0;
    let totalExpense = 0;
    let count = 0;
    for (const t of memoryStore.transactions.values()) {
      if (t.user_id === user_id && t.transaction_date.startsWith(month)) {
        if (t.type === 'income') totalIncome += parseFloat(t.amount);
        if (t.type === 'expense') totalExpense += parseFloat(t.amount);
        count++;
      }
    }
    return {
      rows: [{ total_income: totalIncome, total_expense: totalExpense, total_transactions: count }],
      rowCount: 1,
    };
  }

  // Category breakdown for monthly expenses
  if (normalized.startsWith('SELECT') && normalized.includes('FROM transactions t') && normalized.includes('LEFT JOIN categories c') && normalized.includes('total_amount DESC')) {
    const [user_id, month] = params;
    const catMap = new Map();

    for (const t of memoryStore.transactions.values()) {
      if (t.user_id === user_id && t.type === 'expense' && t.transaction_date.startsWith(month)) {
        const catId = t.category_id || 'uncategorized';
        const cat = t.category_id ? memoryStore.categories.get(t.category_id) : null;
        if (!catMap.has(catId)) {
          catMap.set(catId, {
            category_id: catId,
            category_name: cat ? cat.name : 'Uncategorized',
            category_color: cat ? cat.color_hex : '#94A3B8',
            category_icon: cat ? cat.icon_name : 'help-circle',
            total_amount: 0,
            transaction_count: 0,
          });
        }
        const item = catMap.get(catId);
        item.total_amount += parseFloat(t.amount);
        item.transaction_count++;
      }
    }

    const sorted = Array.from(catMap.values()).sort((a, b) => b.total_amount - a.total_amount);
    return { rows: sorted, rowCount: sorted.length };
  }

  // SELECT COUNT(*) AS total FROM transactions t WHERE ...
  if (normalized.startsWith('SELECT COUNT(*) AS total FROM transactions t')) {
    const user_id = params[0];
    const matching = Array.from(memoryStore.transactions.values()).filter((t) => {
      if (t.user_id !== user_id) return false;
      if (normalized.includes('t.type = $') && params[1] && t.type !== params[1]) return false;
      if (normalized.includes('t.category_id = $') && params[1] && t.category_id !== params[1]) return false;
      return true;
    });
    return { rows: [{ total: matching.length }], rowCount: 1 };
  }

  // SELECT single transaction: WHERE t.id = $1 AND t.user_id = $2
  if (normalized.startsWith('SELECT') && normalized.includes('FROM transactions t') && normalized.includes('WHERE t.id = $1 AND t.user_id = $2')) {
    const [id, user_id] = params;
    const tx = memoryStore.transactions.get(id);
    if (tx && tx.user_id === user_id) {
      const cat = tx.category_id ? memoryStore.categories.get(tx.category_id) : null;
      return {
        rows: [
          {
            ...tx,
            category_name: cat ? cat.name : null,
            category_color: cat ? cat.color_hex : null,
            category_icon: cat ? cat.icon_name : null,
          },
        ],
        rowCount: 1,
      };
    }
    return { rows: [], rowCount: 0 };
  }

  // SELECT list of transactions (paginated)
  if (normalized.startsWith('SELECT') && normalized.includes('FROM transactions t') && normalized.includes('ORDER BY t.transaction_date DESC')) {
    const user_id = params[0];
    let txs = Array.from(memoryStore.transactions.values()).filter((t) => t.user_id === user_id);

    // Apply filters
    for (let i = 1; i < params.length - 2; i++) {
      const p = params[i];
      if (['income', 'expense'].includes(p)) {
        txs = txs.filter((t) => t.type === p);
      } else if (typeof p === 'string' && /^[0-9a-f-]{36}$/i.test(p)) {
        txs = txs.filter((t) => t.category_id === p);
      }
    }

    txs.sort((a, b) => {
      if (a.transaction_date !== b.transaction_date) {
        return a.transaction_date > b.transaction_date ? -1 : 1;
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

    const limit = params[params.length - 2] || 20;
    const offset = params[params.length - 1] || 0;
    const paginated = txs.slice(offset, offset + limit);

    const enriched = paginated.map((tx) => {
      const cat = tx.category_id ? memoryStore.categories.get(tx.category_id) : null;
      return {
        ...tx,
        category_name: cat ? cat.name : null,
        category_color: cat ? cat.color_hex : null,
        category_icon: cat ? cat.icon_name : null,
      };
    });

    return { rows: enriched, rowCount: enriched.length };
  }

  // UPDATE transactions SET ...
  if (normalized.startsWith('UPDATE transactions')) {
    const [id, user_id] = params;
    const tx = memoryStore.transactions.get(id);
    if (!tx || tx.user_id !== user_id) {
      return { rows: [], rowCount: 0 };
    }

    let paramIdx = 2;
    if (normalized.includes('amount = $')) tx.amount = parseFloat(params[paramIdx++]);
    if (normalized.includes('type = $')) tx.type = params[paramIdx++];
    if (normalized.includes('category_id = $')) tx.category_id = params[paramIdx++];
    if (normalized.includes('transaction_date = $')) tx.transaction_date = params[paramIdx++];
    if (normalized.includes('note = $')) tx.note = params[paramIdx++];
    tx.updated_at = new Date().toISOString();
    return { rows: [{ ...tx }], rowCount: 1 };
  }

  // DELETE FROM transactions WHERE id = $1 AND user_id = $2
  if (normalized.startsWith('DELETE FROM transactions')) {
    const [id, user_id] = params;
    const tx = memoryStore.transactions.get(id);
    if (tx && tx.user_id === user_id) {
      memoryStore.transactions.delete(id);
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  return { rows: [], rowCount: 0 };
};

/**
 * Execute a query with connection pooling & latency logging
 * @param {string} text - SQL query string
 * @param {Array} params - Parameterized query values
 */
export const query = async (text, params = []) => {
  const start = Date.now();

  // If we already know PostgreSQL is not available locally, use memory fallback immediately
  if (isPostgresAvailable === false) {
    const res = await executeMemoryQuery(text, params);
    return res;
  }

  try {
    const res = await pool.query(text, params);
    isPostgresAvailable = true;
    const duration = Date.now() - start;
    if (env.NODE_ENV === 'development') {
      console.log(`[PostgreSQL Query] (${duration}ms):`, { text: text.slice(0, 80), rows: res.rowCount });
    }
    return res;
  } catch (error) {
    const isConnectionError =
      error.code === 'ECONNREFUSED' ||
      error.message.includes('connect ECONNREFUSED') ||
      error.message.includes('Connection terminated due to connection timeout') ||
      error.message.includes('connection timeout') ||
      error.message.includes('timeout') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND') ||
      error.code === 'ETIMEDOUT';

    if (isConnectionError) {
      if (isPostgresAvailable !== false) {
        console.warn('ℹ️  [PostgreSQL] Server unreachable — Operating with high-speed in-memory datastore fallback.');
        isPostgresAvailable = false;
      }
      return executeMemoryQuery(text, params);
    }
    const duration = Date.now() - start;
    console.error(`[PostgreSQL Error] (${duration}ms) query: "${text.slice(0, 80)}":`, error.message);
    throw error;
  }
};

/**
 * Acquire a dedicated client for multi-statement transactions
 */
export const getClient = async () => {
  if (isPostgresAvailable === false) {
    return {
      query: (t, p) => executeMemoryQuery(t, p),
      release: () => {},
    };
  }
  try {
    const client = await pool.connect();
    return client;
  } catch (err) {
    const isConnectionError =
      err.code === 'ECONNREFUSED' ||
      err.message?.includes('ECONNREFUSED') ||
      err.message?.includes('timeout') ||
      err.message?.includes('ETIMEDOUT') ||
      err.code === 'ETIMEDOUT';
    if (isConnectionError) {
      isPostgresAvailable = false;
    }
    return {
      query: (t, p) => executeMemoryQuery(t, p),
      release: () => {},
    };
  }
};

/**
 * Health check helper
 */
export const checkDbHealth = async () => {
  try {
    const res = await query('SELECT 1 AS healthy, NOW() AS timestamp;');
    return {
      status: 'UP',
      timestamp: res.rows[0].timestamp,
      engine: isPostgresAvailable ? 'PostgreSQL Pool (Active)' : 'In-Memory Datastore (Fallback)',
      totalCount: isPostgresAvailable ? pool.totalCount : 1,
      idleCount: isPostgresAvailable ? pool.idleCount : 1,
      waitingCount: isPostgresAvailable ? pool.waitingCount : 0,
    };
  } catch (err) {
    return {
      status: 'DOWN',
      error: err.message,
    };
  }
};

/**
 * Graceful shutdown
 */
export const closePool = async () => {
  try {
    if (isPostgresAvailable) {
      console.log('[PostgreSQL] Closing connection pool...');
      await pool.end();
      console.log('[PostgreSQL] Connection pool closed.');
    }
  } catch {
    // Ignore on shutdown
  }
  memoryStore.users.clear();
  memoryStore.synapses.clear();
  memoryStore.tasks.clear();
  memoryStore.habits.clear();
  memoryStore.habit_logs.clear();
  memoryStore.categories.clear();
  memoryStore.transactions.clear();
};
